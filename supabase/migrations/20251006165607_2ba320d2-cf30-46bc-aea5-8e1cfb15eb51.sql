-- Drop ALL existing RLS policies on affected tables
DROP POLICY IF EXISTS "Residents can view own tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Residents can create own tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Managers can update ticket status" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Residents can view own guests" ON public.guests;
DROP POLICY IF EXISTS "Residents can create guests" ON public.guests;
DROP POLICY IF EXISTS "Public can verify guests" ON public.guests;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop existing enum if it exists
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Alter existing profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Make name column nullable
ALTER TABLE public.profiles 
  ALTER COLUMN name DROP NOT NULL;

-- Change role column from enum to text
ALTER TABLE public.profiles 
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE text USING role::text,
  ALTER COLUMN role SET DEFAULT 'resident',
  ALTER COLUMN role SET NOT NULL;

-- Create trigger function to auto-insert profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, full_name, unit, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'unit',
    COALESCE(NEW.raw_user_meta_data->>'role', 'resident')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    unit = COALESCE(EXCLUDED.unit, public.profiles.unit);
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users into profiles
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'resident'
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = COALESCE(public.profiles.role, 'resident');

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS policies for maintenance_tickets
CREATE POLICY "Residents can view their own tickets"
  ON public.maintenance_tickets FOR SELECT
  USING (
    auth.uid() = reporter_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Users can create their own tickets"
  ON public.maintenance_tickets FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Managers can update all tickets"
  ON public.maintenance_tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'));

-- RLS policies for guests
CREATE POLICY "Residents can view their own guests"
  ON public.guests FOR SELECT
  USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Users can create their own guests"
  ON public.guests FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update their own guests"
  ON public.guests FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Managers can update all guests"
  ON public.guests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'));

-- Public policy for verify endpoint
CREATE POLICY "Public can verify guests"
  ON public.guests FOR SELECT
  USING (true);