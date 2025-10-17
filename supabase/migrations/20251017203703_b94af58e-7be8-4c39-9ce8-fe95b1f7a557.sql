-- Drop all existing policies on buildings_new
DROP POLICY IF EXISTS "Admins can view buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can insert buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can update buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can delete buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Managers can view their assigned buildings" ON public.buildings_new;

-- Create simplified policies for buildings_new that don't cause recursion
CREATE POLICY "Admins can view buildings in their org"
ON public.buildings_new
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.org_id = buildings_new.org_id
  )
);

CREATE POLICY "Admins can insert buildings in their org"
ON public.buildings_new
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.org_id = buildings_new.org_id
  )
);

CREATE POLICY "Admins can update buildings in their org"
ON public.buildings_new
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.org_id = buildings_new.org_id
  )
);

CREATE POLICY "Admins can delete buildings in their org"
ON public.buildings_new
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.org_id = buildings_new.org_id
  )
);

-- Simplified manager policy without recursion
CREATE POLICY "Managers can view their assigned buildings"
ON public.buildings_new
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'manager'
  )
  AND EXISTS (
    SELECT 1 FROM public.manager_buildings
    WHERE manager_buildings.user_id = auth.uid()
    AND manager_buildings.building_id = buildings_new.id
  )
);