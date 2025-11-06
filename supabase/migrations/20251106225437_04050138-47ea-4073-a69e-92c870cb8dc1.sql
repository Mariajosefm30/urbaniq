-- Create security definer function to check if user manages a building
CREATE OR REPLACE FUNCTION public.user_manages_building(_user_id uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND (
        role IN ('manager', 'admin')
        AND (
          last_building_id = _building_id
          OR role = 'admin'
        )
      )
  )
$$;

-- Create security definer function to check if user has access to building (as resident, manager, or admin)
CREATE OR REPLACE FUNCTION public.user_has_building_access(_user_id uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND (
        last_building_id = _building_id
        OR role = 'admin'
      )
  )
$$;

-- Drop existing policies on amenities if they exist
DROP POLICY IF EXISTS "Users can view amenities in their building" ON public.amenities;
DROP POLICY IF EXISTS "Managers can create amenities" ON public.amenities;
DROP POLICY IF EXISTS "Managers can update amenities" ON public.amenities;
DROP POLICY IF EXISTS "Managers can delete amenities" ON public.amenities;

-- RLS policies for amenities table
CREATE POLICY "Users can view amenities in their building"
ON public.amenities
FOR SELECT
TO authenticated
USING (public.user_has_building_access(auth.uid(), building_id));

CREATE POLICY "Managers can create amenities"
ON public.amenities
FOR INSERT
TO authenticated
WITH CHECK (public.user_manages_building(auth.uid(), building_id));

CREATE POLICY "Managers can update amenities"
ON public.amenities
FOR UPDATE
TO authenticated
USING (public.user_manages_building(auth.uid(), building_id));

CREATE POLICY "Managers can delete amenities"
ON public.amenities
FOR DELETE
TO authenticated
USING (public.user_manages_building(auth.uid(), building_id));

-- Drop existing policies on amenity_bookings if they exist
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.amenity_bookings;
DROP POLICY IF EXISTS "Managers can view all bookings in their building" ON public.amenity_bookings;
DROP POLICY IF EXISTS "Users can create bookings in their building" ON public.amenity_bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.amenity_bookings;
DROP POLICY IF EXISTS "Managers can update bookings in their building" ON public.amenity_bookings;

-- RLS policies for amenity_bookings table
CREATE POLICY "Users can view their own bookings"
ON public.amenity_bookings
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_manages_building(auth.uid(), building_id)
);

CREATE POLICY "Users can create bookings in their building"
ON public.amenity_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.user_has_building_access(auth.uid(), building_id)
);

CREATE POLICY "Users can update their own bookings"
ON public.amenity_bookings
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_manages_building(auth.uid(), building_id)
);

CREATE POLICY "Users can delete their own bookings"
ON public.amenity_bookings
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_manages_building(auth.uid(), building_id)
);