
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view amenities in their building" ON amenities;
DROP POLICY IF EXISTS "Admins and managers can create amenities" ON amenities;
DROP POLICY IF EXISTS "Admins and managers can update amenities" ON amenities;
DROP POLICY IF EXISTS "Admins and managers can delete amenities" ON amenities;

-- Enable RLS on amenities table
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Policy for viewing amenities (users can view amenities in their building)
CREATE POLICY "Users can view amenities in their building"
ON amenities
FOR SELECT
TO authenticated
USING (
  building_id IN (
    SELECT building_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy for creating amenities (admins and managers only)
CREATE POLICY "Admins and managers can create amenities"
ON amenities
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_manager(auth.uid()) AND
  building_id IN (
    SELECT building_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy for updating amenities (admins and managers only)
CREATE POLICY "Admins and managers can update amenities"
ON amenities
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_manager(auth.uid()) AND
  building_id IN (
    SELECT building_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Policy for deleting amenities (admins and managers only)
CREATE POLICY "Admins and managers can delete amenities"
ON amenities
FOR DELETE
TO authenticated
USING (
  public.is_admin_or_manager(auth.uid()) AND
  building_id IN (
    SELECT building_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);
