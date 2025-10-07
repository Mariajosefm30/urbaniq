-- Add building_address column to profiles for managers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS building_address text;