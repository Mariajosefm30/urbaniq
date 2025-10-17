-- Add resident fields to units and set default for code
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS resident_name text,
  ADD COLUMN IF NOT EXISTS contact_information text;

-- Ensure code has a default so inserts without code succeed
ALTER TABLE public.units
  ALTER COLUMN code SET DEFAULT gen_random_uuid()::text;

-- Enable RLS on units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Helper: check if building is in admin's org
CREATE OR REPLACE FUNCTION public.building_in_admin_org(_user_id uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.buildings_new b ON b.org_id = p.org_id
    WHERE p.id = _user_id
      AND public.is_admin(_user_id)
      AND b.id = _building_id
  )
$$;

-- Admins can fully manage units in their org
DROP POLICY IF EXISTS "Admins manage units in their org" ON public.units;
CREATE POLICY "Admins manage units in their org"
ON public.units
FOR ALL
USING (public.building_in_admin_org(auth.uid(), building_id))
WITH CHECK (public.building_in_admin_org(auth.uid(), building_id));

-- Managers can view units for buildings they are assigned to
DROP POLICY IF EXISTS "Managers view assigned units" ON public.units;
CREATE POLICY "Managers view assigned units"
ON public.units
FOR SELECT
USING (
  public.get_user_role(auth.uid()) = 'manager' AND
  public.manager_has_building_access(auth.uid(), building_id)
);
