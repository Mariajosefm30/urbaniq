
-- Extend ticket_status with 'closed'
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'closed';

-- New enum: visit_status
DO $$ BEGIN
  CREATE TYPE public.visit_status AS ENUM ('expected', 'arrived', 'left');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add roster fields to invites and memberships
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS resident_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS resident_type text CHECK (resident_type IN ('owner','tenant'));

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS resident_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS resident_type text CHECK (resident_type IN ('owner','tenant'));

-- Helper: get current user's unit for a building (resident scoping)
CREATE OR REPLACE FUNCTION public.current_user_unit(_building_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT unit_id FROM public.memberships
  WHERE user_id = auth.uid() AND building_id = _building_id AND role = 'resident'
  LIMIT 1;
$$;

-- Helper: building feature gate (Starter list hardcoded)
CREATE OR REPLACE FUNCTION public.building_has_feature(_building_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE (SELECT tier FROM public.buildings WHERE id = _building_id)
    WHEN 'starter' THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic'])
    WHEN 'growth' THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic','tickets_states','payments_reminders','analytics_realtime'])
    WHEN 'pro' THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic','tickets_states','payments_reminders','analytics_realtime','amenities','roles_by_area','payments_reconciliation','analytics_advanced'])
    WHEN 'developer' THEN true
    ELSE false END;
$$;

-- Update handle_new_user_v2 to copy roster fields
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv RECORD;
BEGIN
  FOR inv IN
    SELECT * FROM public.invites
    WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL AND expires_at > now()
    ORDER BY created_at ASC
  LOOP
    INSERT INTO public.memberships (user_id, building_id, role, unit_id, resident_name, phone, resident_type)
    VALUES (NEW.id, inv.building_id, inv.role, inv.unit_id, inv.resident_name, inv.phone, inv.resident_type)
    ON CONFLICT DO NOTHING;
    UPDATE public.invites SET accepted_at = now() WHERE id = inv.id;
  END LOOP;
  RETURN NEW;
END;
$$;

-- =========== posts ===========
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_read" ON public.posts FOR SELECT TO authenticated
USING (public.has_any_building_access(auth.uid(), building_id));
CREATE POLICY "posts_insert" ON public.posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.has_any_building_access(auth.uid(), building_id));
CREATE POLICY "posts_board_update" ON public.posts FOR UPDATE TO authenticated
USING (public.is_board_or_admin(auth.uid(), building_id))
WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));
CREATE POLICY "posts_author_or_board_delete" ON public.posts FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_board_or_admin(auth.uid(), building_id));

-- =========== tickets ===========
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status public.ticket_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_board_all" ON public.tickets FOR ALL TO authenticated
USING (public.is_board_or_admin(auth.uid(), building_id))
WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));
CREATE POLICY "tickets_resident_select" ON public.tickets FOR SELECT TO authenticated
USING (unit_id IS NOT NULL AND unit_id = public.current_user_unit(building_id));
CREATE POLICY "tickets_resident_insert" ON public.tickets FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND unit_id = public.current_user_unit(building_id));

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== visits ===========
CREATE TABLE IF NOT EXISTS public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  expected_at timestamptz,
  status public.visit_status NOT NULL DEFAULT 'expected',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visits_board_all" ON public.visits FOR ALL TO authenticated
USING (public.is_board_or_admin(auth.uid(), building_id))
WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));
CREATE POLICY "visits_resident_select" ON public.visits FOR SELECT TO authenticated
USING (unit_id IS NOT NULL AND unit_id = public.current_user_unit(building_id));
CREATE POLICY "visits_resident_insert" ON public.visits FOR INSERT TO authenticated
WITH CHECK (host_id = auth.uid() AND unit_id = public.current_user_unit(building_id));

-- =========== charges ===========
CREATE TABLE IF NOT EXISTS public.charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  concept text NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_date date,
  period text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charges TO authenticated;
GRANT ALL ON public.charges TO service_role;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "charges_board_all" ON public.charges FOR ALL TO authenticated
USING (public.is_board_or_admin(auth.uid(), building_id))
WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));
CREATE POLICY "charges_resident_select" ON public.charges FOR SELECT TO authenticated
USING (unit_id IS NOT NULL AND unit_id = public.current_user_unit(building_id));

CREATE TRIGGER trg_charges_updated_at BEFORE UPDATE ON public.charges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Units: allow board to delete (add DELETE policy if not present)
DO $$ BEGIN
  CREATE POLICY "units_board_all" ON public.units FOR ALL TO authenticated
  USING (public.is_board_or_admin(auth.uid(), building_id))
  WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
