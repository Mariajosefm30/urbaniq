
CREATE TABLE IF NOT EXISTS public.pending_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  org_id uuid NOT NULL,
  invited_by uuid,
  claimed_at timestamptz,
  claimed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, org_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_admins TO authenticated;
GRANT ALL ON public.pending_admins TO service_role;

ALTER TABLE public.pending_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage all pending admins"
ON public.pending_admins FOR ALL TO authenticated
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins view their org pending admins"
ON public.pending_admins FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) AND org_id = public.get_user_org_id(auth.uid()));

-- Update handle_new_user to also auto-promote pending admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pending RECORD;
  pending_admin RECORD;
  v_unit_code text;
  v_org_id uuid;
BEGIN
  -- 1) Pending admin invitation?
  SELECT * INTO pending_admin
  FROM public.pending_admins
  WHERE lower(email) = lower(NEW.email) AND claimed_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF pending_admin.id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, role, name, full_name, org_id)
    VALUES (
      NEW.id, NEW.email, 'admin',
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      pending_admin.org_id
    )
    ON CONFLICT (id) DO UPDATE SET
      org_id = EXCLUDED.org_id,
      role = 'admin';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;

    UPDATE public.pending_admins
       SET claimed_at = now(), claimed_by_user_id = NEW.id
     WHERE id = pending_admin.id;

    RETURN NEW;
  END IF;

  -- 2) Pending resident invitation?
  SELECT pr.*, b.org_id AS building_org_id
    INTO pending
  FROM public.pending_residents pr
  JOIN public.buildings_new b ON b.id = pr.building_id
  WHERE lower(pr.email) = lower(NEW.email)
    AND pr.claimed_at IS NULL
  ORDER BY pr.created_at ASC
  LIMIT 1;

  IF pending.id IS NOT NULL THEN
    v_org_id := COALESCE(pending.org_id, pending.building_org_id);
    IF pending.unit_id IS NOT NULL THEN
      SELECT code INTO v_unit_code FROM public.units WHERE id = pending.unit_id;
    END IF;

    INSERT INTO public.profiles (id, email, role, name, full_name, org_id, building_id, last_building_id, unit)
    VALUES (
      NEW.id, NEW.email, 'resident',
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      v_org_id, pending.building_id, pending.building_id, v_unit_code
    )
    ON CONFLICT (id) DO UPDATE SET
      org_id = EXCLUDED.org_id,
      building_id = EXCLUDED.building_id,
      last_building_id = EXCLUDED.last_building_id,
      unit = EXCLUDED.unit;

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'resident') ON CONFLICT DO NOTHING;
    INSERT INTO public.building_memberships (user_id, building_id, role, unit_id)
    VALUES (NEW.id, pending.building_id, 'resident', pending.unit_id)
    ON CONFLICT DO NOTHING;

    IF pending.unit_id IS NOT NULL THEN
      UPDATE public.units SET resident_user_id = NEW.id WHERE id = pending.unit_id;
    END IF;

    UPDATE public.pending_residents
       SET claimed_at = now(), claimed_by_user_id = NEW.id
     WHERE id = pending.id;
  ELSE
    INSERT INTO public.profiles (id, email, role, name, full_name)
    VALUES (
      NEW.id, NEW.email, 'resident',
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
