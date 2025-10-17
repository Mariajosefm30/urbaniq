-- Clean up conflicting/recursive policies on manager_buildings
DROP POLICY IF EXISTS "Admins can manage building assignments" ON public.manager_buildings;
DROP POLICY IF EXISTS "Admins can view all building assignments" ON public.manager_buildings;
DROP POLICY IF EXISTS "Managers can view their assignments" ON public.manager_buildings;