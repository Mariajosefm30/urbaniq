-- Fix manager visibility: check resident's building_id directly
CREATE OR REPLACE FUNCTION public.user_manages_resident(_user_id uuid, _resident_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- A manager manages a resident if that resident is assigned to a building
  -- that the manager is assigned to via manager_buildings
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.manager_buildings mb ON mb.building_id = p.building_id
    WHERE mb.user_id = _user_id
      AND p.id = _resident_id
  );
$$;