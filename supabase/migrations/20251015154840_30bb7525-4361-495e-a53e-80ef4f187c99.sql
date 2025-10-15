-- CRITICAL: Do NOT store roles on profiles table due to privilege escalation risk
-- Instead, extend the existing user_roles table to support admin role

-- 1. Update the app_role enum to include admin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- 2. Organizations table already exists, ensure it's properly set up
-- (organizations table already exists per types.ts)

-- 3. Create manager_buildings junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.manager_buildings (
  user_id uuid NOT NULL,
  building_id uuid NOT NULL REFERENCES public.buildings_new(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, building_id)
);

-- 4. Enable RLS on manager_buildings
ALTER TABLE public.manager_buildings ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for manager_buildings
-- Managers can view their own building assignments
CREATE POLICY "Managers can view their building assignments"
ON public.manager_buildings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all building assignments
CREATE POLICY "Admins can view all building assignments"
ON public.manager_buildings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert building assignments
CREATE POLICY "Admins can manage building assignments"
ON public.manager_buildings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Add org_id to profiles if not exists (for convenience, not for role!)
-- last_building_id already added in previous migration
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id);

-- 7. Update buildings_new RLS to check manager_buildings junction table
DROP POLICY IF EXISTS "Managers can view their buildings" ON public.buildings_new;

CREATE POLICY "Managers can view assigned buildings"
ON public.buildings_new
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.manager_buildings
    WHERE manager_buildings.building_id = buildings_new.id
      AND manager_buildings.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage all buildings"
ON public.buildings_new
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));