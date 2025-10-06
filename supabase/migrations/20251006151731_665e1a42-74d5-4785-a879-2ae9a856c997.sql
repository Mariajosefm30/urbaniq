-- Create role enum
CREATE TYPE app_role AS ENUM ('resident', 'manager');

-- Create ticket status enum
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved');

-- Create guest status enum
CREATE TYPE guest_status AS ENUM ('scheduled', 'expired', 'revoked');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'resident',
  name TEXT NOT NULL,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create maintenance_tickets table
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  photo_url TEXT,
  status ticket_status NOT NULL DEFAULT 'open',
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on maintenance_tickets
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- Maintenance tickets policies
CREATE POLICY "Residents can view own tickets"
  ON public.maintenance_tickets FOR SELECT
  USING (
    reporter_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Residents can create own tickets"
  ON public.maintenance_tickets FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Managers can update ticket status"
  ON public.maintenance_tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'));

-- Create guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  arrival_at TIMESTAMPTZ NOT NULL,
  qr_token_hash TEXT NOT NULL UNIQUE,
  qr_expires_at TIMESTAMPTZ NOT NULL,
  status guest_status NOT NULL DEFAULT 'scheduled',
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on guests
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Guests policies
CREATE POLICY "Residents can view own guests"
  ON public.guests FOR SELECT
  USING (
    host_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
  );

CREATE POLICY "Residents can create guests"
  ON public.guests FOR INSERT
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Public can verify guests"
  ON public.guests FOR SELECT
  USING (true);

-- Trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'resident')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for maintenance_tickets updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();