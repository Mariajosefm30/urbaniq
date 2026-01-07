-- Drop conflicting/duplicate SELECT policies on buildings_new
DROP POLICY IF EXISTS "Admins can view buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can manage all buildings" ON public.buildings_new;
DROP POLICY IF EXISTS "Managers can manage buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Managers can view assigned buildings" ON public.buildings_new;
DROP POLICY IF EXISTS "Managers can view their assigned buildings" ON public.buildings_new;
DROP POLICY IF EXISTS "Users can view buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can insert buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can update buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can delete buildings in their org" ON public.buildings_new;

-- Create clean, simplified policies using has_role() function for consistency

-- SELECT: Admins can view buildings in their org, managers can view assigned buildings
CREATE POLICY "buildings_select" ON public.buildings_new FOR SELECT USING (
  -- Admin with matching org_id
  (
    has_role(auth.uid(), 'admin') 
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = buildings_new.org_id
    )
  )
  OR
  -- Manager with building assignment
  (
    has_role(auth.uid(), 'manager')
    AND EXISTS (
      SELECT 1 FROM manager_buildings WHERE manager_buildings.user_id = auth.uid() AND manager_buildings.building_id = buildings_new.id
    )
  )
  OR
  -- Resident in the same org
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = buildings_new.org_id
  )
);

-- INSERT: Only admins in their org
CREATE POLICY "buildings_insert" ON public.buildings_new FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = buildings_new.org_id
  )
);

-- UPDATE: Only admins in their org
CREATE POLICY "buildings_update" ON public.buildings_new FOR UPDATE USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = buildings_new.org_id
  )
);

-- DELETE: Only admins in their org
CREATE POLICY "buildings_delete" ON public.buildings_new FOR DELETE USING (
  has_role(auth.uid(), 'admin')
  AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.org_id = buildings_new.org_id
  )
);