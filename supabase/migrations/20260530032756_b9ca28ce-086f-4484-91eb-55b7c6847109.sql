
-- 1. is_superadmin helper
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'superadmin'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, service_role;

-- 2. pending_residents table
CREATE TABLE IF NOT EXISTS public.pending_residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  building_id uuid NOT NULL,
  unit_id uuid,
  org_id uuid,
  invited_by uuid,
  claimed_at timestamptz,
  claimed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pending_residents_email_building_uniq
  ON public.pending_residents (lower(email), building_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_residents TO authenticated;
GRANT ALL ON public.pending_residents TO service_role;

ALTER TABLE public.pending_residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage all pending residents"
  ON public.pending_residents FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins view their org pending residents"
  ON public.pending_residents FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND org_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY "Admins insert pending residents in their org"
  ON public.pending_residents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND org_id = public.get_user_org_id(auth.uid())
    AND invited_by = auth.uid()
  );

CREATE POLICY "Admins delete pending residents in their org"
  ON public.pending_residents FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND org_id = public.get_user_org_id(auth.uid())
  );

CREATE POLICY "Managers view pending residents in their buildings"
  ON public.pending_residents FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager'::app_role)
    AND public.manager_has_building_access(auth.uid(), building_id)
  );

-- 3. Update signup trigger to auto-link pre-created residents
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending RECORD;
  v_unit_code text;
  v_org_id uuid;
BEGIN
  -- Look for a pending resident invitation matching this email
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
      NEW.id,
      NEW.email,
      'resident',
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      v_org_id,
      pending.building_id,
      pending.building_id,
      v_unit_code
    )
    ON CONFLICT (id) DO UPDATE SET
      org_id = EXCLUDED.org_id,
      building_id = EXCLUDED.building_id,
      last_building_id = EXCLUDED.last_building_id,
      unit = EXCLUDED.unit;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'resident')
    ON CONFLICT DO NOTHING;

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
      NEW.id,
      NEW.email,
      'resident',
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Superadmin RLS overlays on key tables
CREATE POLICY "Superadmins manage all organizations"
  ON public.organizations FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins manage all buildings_new"
  ON public.buildings_new FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins manage all user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- 5. Seed superadmin for the founder
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::app_role
FROM auth.users
WHERE lower(email) = 'mfernandezmelgar@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
