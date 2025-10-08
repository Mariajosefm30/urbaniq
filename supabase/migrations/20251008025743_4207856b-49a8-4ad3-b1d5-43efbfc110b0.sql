-- Add unit column to guests table
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS unit TEXT;