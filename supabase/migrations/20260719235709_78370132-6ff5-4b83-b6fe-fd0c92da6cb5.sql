
-- 1. Slot uniqueness for owner/tenant per unit
CREATE UNIQUE INDEX IF NOT EXISTS memberships_resident_slot_unique
ON public.memberships(building_id, unit_id, resident_type)
WHERE role = 'resident' AND unit_id IS NOT NULL AND resident_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invites_resident_slot_pending_unique
ON public.invites(building_id, unit_id, resident_type)
WHERE role = 'resident' AND accepted_at IS NULL AND unit_id IS NOT NULL AND resident_type IS NOT NULL;

-- 2. Charges visible to owner only (not tenant)
DROP POLICY IF EXISTS charges_resident_select ON public.charges;
CREATE POLICY charges_owner_select ON public.charges
  FOR SELECT USING (
    unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.unit_id = charges.unit_id
        AND m.resident_type = 'owner'
    )
  );

-- 3. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_own_select ON public.notifications;
CREATE POLICY notif_own_select ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS notif_own_update ON public.notifications;
CREATE POLICY notif_own_update ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS notif_own_delete ON public.notifications;
CREATE POLICY notif_own_delete ON public.notifications FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

-- 4. Trigger: tenant opens ticket -> notify owner(s)
CREATE OR REPLACE FUNCTION public.notify_owner_on_tenant_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_type text;
  tenant_name text;
  unit_code text;
  owner_row record;
BEGIN
  SELECT resident_type, resident_name
    INTO creator_type, tenant_name
  FROM public.memberships
  WHERE user_id = NEW.created_by AND building_id = NEW.building_id
  LIMIT 1;

  IF creator_type IS DISTINCT FROM 'tenant' THEN
    RETURN NEW;
  END IF;

  SELECT code INTO unit_code FROM public.units WHERE id = NEW.unit_id;

  FOR owner_row IN
    SELECT user_id FROM public.memberships
    WHERE building_id = NEW.building_id
      AND unit_id = NEW.unit_id
      AND resident_type = 'owner'
  LOOP
    INSERT INTO public.notifications (user_id, building_id, kind, payload)
    VALUES (
      owner_row.user_id,
      NEW.building_id,
      'ticket_created_by_tenant',
      jsonb_build_object(
        'ticket_id', NEW.id,
        'unit', unit_code,
        'tenant_name', tenant_name,
        'title', NEW.title
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_owner_on_tenant_ticket ON public.tickets;
CREATE TRIGGER trg_notify_owner_on_tenant_ticket
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_owner_on_tenant_ticket();
