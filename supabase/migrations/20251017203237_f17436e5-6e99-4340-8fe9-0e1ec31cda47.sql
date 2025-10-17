-- Create security definer function to check user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role(_user_id) = 'admin'
$$;

-- Enable RLS on organizations if not already enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;

-- Create policies for organizations table
CREATE POLICY "Admins can view organizations"
ON public.organizations
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update organizations"
ON public.organizations
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete organizations"
ON public.organizations
FOR DELETE
USING (public.is_admin(auth.uid()));