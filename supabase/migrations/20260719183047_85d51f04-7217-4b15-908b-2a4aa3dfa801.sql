
-- WIPE
DROP TABLE IF EXISTS public.waitlist_notifications CASCADE;
DROP TABLE IF EXISTS public.amenity_waitlist CASCADE;
DROP TABLE IF EXISTS public.amenity_bookings CASCADE;
DROP TABLE IF EXISTS public.amenities CASCADE;
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.unit_messages CASCADE;
DROP TABLE IF EXISTS public.maintenance_tickets CASCADE;
DROP TABLE IF EXISTS public.maintenance_alerts CASCADE;
DROP TABLE IF EXISTS public.technicians CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.guests CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.feed_posts CASCADE;
DROP TABLE IF EXISTS public.manager_buildings CASCADE;
DROP TABLE IF EXISTS public.building_memberships CASCADE;
DROP TABLE IF EXISTS public.pending_admins CASCADE;
DROP TABLE IF EXISTS public.pending_residents CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;
DROP TABLE IF EXISTS public.buildings_new CASCADE;
DROP TABLE IF EXISTS public.buildings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_superadmin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_manager(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_org_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_manages_building(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_manages_resident(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_manages_unit(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_building_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.manager_has_building_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.building_in_admin_org(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_building_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_building_admin_or_manager(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_building_role(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_recurring_alerts() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_waitlist() CASCADE;
DROP FUNCTION IF EXISTS public.check_booking_overlap() CASCADE;
DROP FUNCTION IF EXISTS public.notify_waitlist_on_cancellation() CASCADE;
DROP FUNCTION IF EXISTS public.sync_manager_assignment() CASCADE;
DROP FUNCTION IF EXISTS public.update_units_updated_at() CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DELETE FROM auth.users;

-- NEW SCHEMA
CREATE TYPE public.app_role_v2 AS ENUM ('platform_admin', 'admin_board', 'manager', 'resident');
CREATE TYPE public.building_tier AS ENUM ('starter', 'growth', 'pro', 'developer');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier public.building_tier NOT NULL DEFAULT 'starter',
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (building_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  role public.app_role_v2 NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (role = 'platform_admin' AND building_id IS NULL)
    OR (role <> 'platform_admin' AND building_id IS NOT NULL)
  ),
  CHECK (role <> 'resident' OR unit_id IS NOT NULL)
);
CREATE UNIQUE INDEX memberships_user_building_role_uidx
  ON public.memberships (user_id, COALESCE(building_id::text, 'null'), role);
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_building ON public.memberships(building_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  role public.app_role_v2 NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (role = 'platform_admin' AND building_id IS NULL)
    OR (role <> 'platform_admin' AND building_id IS NOT NULL)
  )
);
CREATE INDEX idx_invites_email ON public.invites (lower(email));
CREATE INDEX idx_invites_token ON public.invites(token);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER buildings_updated_at BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpers
CREATE OR REPLACE FUNCTION public.is_platform_admin(_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = _uid AND role = 'platform_admin');
$$;

CREATE OR REPLACE FUNCTION public.has_building_role(_uid UUID, _building_id UUID, _role public.app_role_v2)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _uid AND building_id = _building_id AND role = _role
  ) OR public.is_platform_admin(_uid);
$$;

CREATE OR REPLACE FUNCTION public.has_any_building_access(_uid UUID, _building_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships WHERE user_id = _uid AND building_id = _building_id
  ) OR public.is_platform_admin(_uid);
$$;

CREATE OR REPLACE FUNCTION public.is_board_or_admin(_uid UUID, _building_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _uid AND building_id = _building_id AND role IN ('admin_board', 'manager')
  ) OR public.is_platform_admin(_uid);
$$;

-- Policies
CREATE POLICY "buildings_select" ON public.buildings FOR SELECT TO authenticated
  USING (public.has_any_building_access(auth.uid(), id));
CREATE POLICY "buildings_platform_all" ON public.buildings FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "buildings_board_update" ON public.buildings FOR UPDATE TO authenticated
  USING (public.has_building_role(auth.uid(), id, 'admin_board'))
  WITH CHECK (public.has_building_role(auth.uid(), id, 'admin_board'));

CREATE POLICY "units_select" ON public.units FOR SELECT TO authenticated
  USING (public.has_any_building_access(auth.uid(), building_id));
CREATE POLICY "units_manage" ON public.units FOR ALL TO authenticated
  USING (public.is_board_or_admin(auth.uid(), building_id))
  WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));

CREATE POLICY "memberships_own" ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "memberships_platform_all" ON public.memberships FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "memberships_board_select" ON public.memberships FOR SELECT TO authenticated
  USING (building_id IS NOT NULL AND public.is_board_or_admin(auth.uid(), building_id));
CREATE POLICY "memberships_board_manage" ON public.memberships FOR ALL TO authenticated
  USING (
    building_id IS NOT NULL AND role IN ('resident', 'manager')
    AND public.has_building_role(auth.uid(), building_id, 'admin_board')
  )
  WITH CHECK (
    building_id IS NOT NULL AND role IN ('resident', 'manager')
    AND public.has_building_role(auth.uid(), building_id, 'admin_board')
  );

CREATE POLICY "invites_platform_all" ON public.invites FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "invites_board_manage" ON public.invites FOR ALL TO authenticated
  USING (
    building_id IS NOT NULL AND role IN ('resident', 'manager')
    AND public.has_building_role(auth.uid(), building_id, 'admin_board')
  )
  WITH CHECK (
    building_id IS NOT NULL AND role IN ('resident', 'manager')
    AND public.has_building_role(auth.uid(), building_id, 'admin_board')
  );

-- New user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv RECORD;
BEGIN
  FOR inv IN
    SELECT * FROM public.invites
    WHERE lower(email) = lower(NEW.email)
      AND accepted_at IS NULL AND expires_at > now()
    ORDER BY created_at ASC
  LOOP
    INSERT INTO public.memberships (user_id, building_id, role, unit_id)
    VALUES (NEW.id, inv.building_id, inv.role, inv.unit_id)
    ON CONFLICT DO NOTHING;
    UPDATE public.invites SET accepted_at = now() WHERE id = inv.id;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_v2
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();

-- Seed platform_admin invite
INSERT INTO public.invites (email, role, building_id, expires_at)
VALUES ('mfernandezmelgar@gmail.com', 'platform_admin', NULL, now() + INTERVAL '365 days');
