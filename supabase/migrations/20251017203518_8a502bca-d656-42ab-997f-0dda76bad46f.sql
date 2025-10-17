-- Fix infinite recursion in manager_buildings by dropping and recreating policies
DROP POLICY IF EXISTS "Admins can manage manager building assignments" ON public.manager_buildings;
DROP POLICY IF EXISTS "Managers can view their building assignments" ON public.manager_buildings;

-- Create simple policies for manager_buildings without recursion
CREATE POLICY "Admins can manage manager building assignments"
ON public.manager_buildings
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Managers can view their building assignments"
ON public.manager_buildings
FOR SELECT
USING (auth.uid() = user_id);

-- Enable RLS on buildings_new if not already enabled
ALTER TABLE public.buildings_new ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on buildings_new if any
DROP POLICY IF EXISTS "Admins can view buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can insert buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can update buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Admins can delete buildings in their org" ON public.buildings_new;
DROP POLICY IF EXISTS "Managers can view their assigned buildings" ON public.buildings_new;

-- Create helper function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Create policies for buildings_new table
CREATE POLICY "Admins can view buildings in their org"
ON public.buildings_new
FOR SELECT
USING (
  public.is_admin(auth.uid()) AND 
  org_id = public.get_user_org_id(auth.uid())
);

CREATE POLICY "Admins can insert buildings in their org"
ON public.buildings_new
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) AND
  org_id = public.get_user_org_id(auth.uid())
);

CREATE POLICY "Admins can update buildings in their org"
ON public.buildings_new
FOR UPDATE
USING (
  public.is_admin(auth.uid()) AND
  org_id = public.get_user_org_id(auth.uid())
);

CREATE POLICY "Admins can delete buildings in their org"
ON public.buildings_new
FOR DELETE
USING (
  public.is_admin(auth.uid()) AND
  org_id = public.get_user_org_id(auth.uid())
);

-- Create helper function to check if manager has access to building
CREATE OR REPLACE FUNCTION public.manager_has_building_access(_user_id uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.manager_buildings 
    WHERE user_id = _user_id AND building_id = _building_id
  )
$$;

-- Allow managers to view their assigned buildings
CREATE POLICY "Managers can view their assigned buildings"
ON public.buildings_new
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'manager' AND
  public.manager_has_building_access(auth.uid(), id)
);