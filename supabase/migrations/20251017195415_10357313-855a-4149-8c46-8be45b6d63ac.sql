-- Add org_id to buildings table
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Ensure profiles table has all required columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin', 'manager', 'resident')) DEFAULT 'resident',
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL;

-- Create manager_buildings junction table
CREATE TABLE IF NOT EXISTS public.manager_buildings (
  user_id UUID NOT NULL,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, building_id)
);

-- Enable RLS
ALTER TABLE public.manager_buildings ENABLE ROW LEVEL SECURITY;

-- Create or replace function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'resident',
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles from auth.users
INSERT INTO public.profiles (id, email, role, name, full_name)
SELECT 
  au.id,
  au.email,
  'resident',
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  COALESCE(au.raw_user_meta_data->>'full_name', au.email)
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for buildings
DROP POLICY IF EXISTS "Users can view buildings in their org" ON public.buildings;
CREATE POLICY "Users can view buildings in their org"
  ON public.buildings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        (profiles.role = 'admin' AND profiles.org_id = buildings.org_id)
        OR (profiles.role = 'manager' AND EXISTS (
          SELECT 1 FROM public.manager_buildings mb
          WHERE mb.user_id = auth.uid() AND mb.building_id = buildings.id
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Admins can manage buildings in their org" ON public.buildings;
CREATE POLICY "Admins can manage buildings in their org"
  ON public.buildings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.org_id = buildings.org_id
    )
  );

-- RLS Policies for manager_buildings
DROP POLICY IF EXISTS "Admins can manage building assignments" ON public.manager_buildings;
CREATE POLICY "Admins can manage building assignments"
  ON public.manager_buildings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.buildings b ON b.id = manager_buildings.building_id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.org_id = b.org_id
    )
  );

DROP POLICY IF EXISTS "Managers can view their assignments" ON public.manager_buildings;
CREATE POLICY "Managers can view their assignments"
  ON public.manager_buildings FOR SELECT
  USING (user_id = auth.uid());