-- Update is_building_admin to also check global admin role
CREATE OR REPLACE FUNCTION public.is_building_admin(_building_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.building_memberships
    WHERE building_id = _building_id
      AND user_id = _user_id
      AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Update is_building_admin_or_manager to also check global admin role
CREATE OR REPLACE FUNCTION public.is_building_admin_or_manager(_building_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.building_memberships
    WHERE building_id = _building_id
      AND user_id = _user_id
      AND role IN ('admin', 'manager')
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;