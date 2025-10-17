-- Add manager_email field to buildings_new
ALTER TABLE public.buildings_new
  ADD COLUMN IF NOT EXISTS manager_email text;