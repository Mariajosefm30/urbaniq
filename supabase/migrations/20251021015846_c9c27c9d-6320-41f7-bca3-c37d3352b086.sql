-- Fix manager visibility for tickets: rely on unit->resident mapping instead of profiles.building_id
CREATE OR REPLACE FUNCTION public.user_manages_resident(_user_id uuid, _resident_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- A manager manages a resident if that resident is assigned to any unit
  -- in a building the manager is assigned to via manager_buildings
  SELECT EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.manager_buildings mb ON mb.building_id = u.building_id
    WHERE mb.user_id = _user_id
      AND u.resident_user_id = _resident_id
  );
$$;