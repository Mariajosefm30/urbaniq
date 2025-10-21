-- ============================================
-- Manager Access Control for Units, Tickets, Guests
-- ============================================

-- Step 1: Create helper function to check if user manages a building
CREATE OR REPLACE FUNCTION public.user_manages_building(_user_id uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.manager_buildings
    WHERE user_id = _user_id
      AND building_id = _building_id
  );
$$;

-- Step 2: Create helper function to check if user manages a unit (by unit ID)
CREATE OR REPLACE FUNCTION public.user_manages_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.units u
    INNER JOIN public.manager_buildings mb ON u.building_id = mb.building_id
    WHERE mb.user_id = _user_id
      AND u.id = _unit_id
  );
$$;

-- Step 3: Create helper function to check if user manages a unit by resident email
CREATE OR REPLACE FUNCTION public.user_manages_resident(_user_id uuid, _resident_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.units u ON p.building_id = u.building_id
    INNER JOIN public.manager_buildings mb ON u.building_id = mb.building_id
    WHERE mb.user_id = _user_id
      AND p.id = _resident_id
  );
$$;

-- ============================================
-- Units Table RLS Policies
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all units" ON public.units;
DROP POLICY IF EXISTS "Managers can view units in their buildings" ON public.units;
DROP POLICY IF EXISTS "Admins can insert units" ON public.units;
DROP POLICY IF EXISTS "Admins can update units" ON public.units;
DROP POLICY IF EXISTS "Admins can delete units" ON public.units;

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with units
CREATE POLICY "Admins can view all units"
ON public.units FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert units"
ON public.units FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update units"
ON public.units FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete units"
ON public.units FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Managers can view units in their assigned buildings
CREATE POLICY "Managers can view units in their buildings"
ON public.units FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager') 
  AND public.user_manages_building(auth.uid(), building_id)
);

-- ============================================
-- Maintenance Tickets RLS Policies
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Managers can view tickets from their buildings" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.maintenance_tickets;

-- Managers can view tickets from residents in their buildings
CREATE POLICY "Managers can view tickets from their buildings"
ON public.maintenance_tickets FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager')
  AND public.user_manages_resident(auth.uid(), reporter_id)
);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.maintenance_tickets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Guests RLS Policies
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Managers can view guests from their buildings" ON public.guests;
DROP POLICY IF EXISTS "Admins can view all guests" ON public.guests;

-- Managers can view guests from residents in their buildings
CREATE POLICY "Managers can view guests from their buildings"
ON public.guests FOR SELECT
USING (
  public.has_role(auth.uid(), 'manager')
  AND public.user_manages_resident(auth.uid(), host_id)
);

-- Admins can view all guests
CREATE POLICY "Admins can view all guests"
ON public.guests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));