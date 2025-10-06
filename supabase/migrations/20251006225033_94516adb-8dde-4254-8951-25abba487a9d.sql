-- Fix infinite recursion in user_roles RLS policies with correct type casting
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles during signup" ON public.user_roles;

-- Create a security definer function to check roles WITHOUT triggering RLS
-- Use app_role enum type
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
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
      AND role::text = _role
  )
$$;

-- Create new RLS policies using the security definer function
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can insert own roles during signup"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ensure guests table has proper RLS
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Drop and recreate guests policies
DROP POLICY IF EXISTS "guests_insert_own" ON public.guests;
DROP POLICY IF EXISTS "guests_select_own_or_manager" ON public.guests;
DROP POLICY IF EXISTS "guests_update_manager" ON public.guests;
DROP POLICY IF EXISTS "Users can insert their own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can view their own guests" ON public.guests;
DROP POLICY IF EXISTS "Managers can view all guests" ON public.guests;
DROP POLICY IF EXISTS "Managers can update guests" ON public.guests;

-- Create new guests policies
CREATE POLICY "guests_insert_own"
  ON public.guests
  FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "guests_select_own_or_manager"
  ON public.guests
  FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "guests_update_manager"
  ON public.guests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));