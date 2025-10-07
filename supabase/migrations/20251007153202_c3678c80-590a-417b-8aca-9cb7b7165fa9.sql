-- Add priority and unit columns to maintenance_tickets
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'low' CHECK (priority IN ('low', 'normal', 'high')),
  ADD COLUMN IF NOT EXISTS unit text;