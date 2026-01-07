-- Create building_memberships table for per-building role management
CREATE TABLE public.building_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings_new(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'resident')),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, user_id)
);

-- Enable RLS
ALTER TABLE public.building_memberships ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check building membership
CREATE OR REPLACE FUNCTION public.has_building_role(_building_id uuid, _user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.building_memberships
    WHERE building_id = _building_id
      AND user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is admin or manager for a building
CREATE OR REPLACE FUNCTION public.is_building_admin_or_manager(_building_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.building_memberships
    WHERE building_id = _building_id
      AND user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Check if user is admin for a building
CREATE OR REPLACE FUNCTION public.is_building_admin(_building_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.building_memberships
    WHERE building_id = _building_id
      AND user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS Policies for building_memberships
-- Admins and managers can view memberships for their buildings
CREATE POLICY "Users can view memberships for their buildings"
ON public.building_memberships
FOR SELECT
USING (
  public.is_building_admin_or_manager(building_id, auth.uid())
  OR user_id = auth.uid()
);

-- Only building admins can insert memberships
CREATE POLICY "Building admins can insert memberships"
ON public.building_memberships
FOR INSERT
WITH CHECK (
  public.is_building_admin(building_id, auth.uid())
);

-- Only building admins can update memberships
CREATE POLICY "Building admins can update memberships"
ON public.building_memberships
FOR UPDATE
USING (public.is_building_admin(building_id, auth.uid()));

-- Only building admins can delete memberships
CREATE POLICY "Building admins can delete memberships"
ON public.building_memberships
FOR DELETE
USING (public.is_building_admin(building_id, auth.uid()));

-- Allow users to insert their own admin membership when creating a building (bootstrap)
CREATE POLICY "Users can create their own admin membership"
ON public.building_memberships
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND role = 'admin'
);