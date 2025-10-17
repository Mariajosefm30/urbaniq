-- Add new fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS secondary_contact_name TEXT;

-- Remove phone columns from organizations as they're not in the new design
ALTER TABLE organizations
DROP COLUMN IF EXISTS primary_contact_phone,
DROP COLUMN IF EXISTS secondary_contact_phone;

-- Add new fields to buildings_new table
ALTER TABLE buildings_new
ADD COLUMN IF NOT EXISTS manager_name TEXT,
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Remove old address column
ALTER TABLE buildings_new
DROP COLUMN IF EXISTS address;

-- Create units table for managing units in buildings
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings_new(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  resident_name TEXT,
  contact_information TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, unit_number)
);

-- Enable RLS on units table
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for units table
CREATE POLICY "Admins can view all units"
ON units
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM buildings_new b
    JOIN profiles p ON p.org_id = b.org_id
    WHERE b.id = units.building_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Admins can insert units"
ON units
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM buildings_new b
    JOIN profiles p ON p.org_id = b.org_id
    WHERE b.id = units.building_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Admins can update units"
ON units
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM buildings_new b
    JOIN profiles p ON p.org_id = b.org_id
    WHERE b.id = units.building_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Admins can delete units"
ON units
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM buildings_new b
    JOIN profiles p ON p.org_id = b.org_id
    WHERE b.id = units.building_id
    AND p.id = auth.uid()
    AND public.has_role(auth.uid(), 'admin')
  )
);