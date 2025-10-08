-- Add access code columns to maintenance_tickets table
ALTER TABLE public.maintenance_tickets
ADD COLUMN IF NOT EXISTS access_code TEXT,
ADD COLUMN IF NOT EXISTS access_code_status TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS access_code_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS access_code_attempts INTEGER DEFAULT 0;

-- Add check constraint for access_code_status
ALTER TABLE public.maintenance_tickets
ADD CONSTRAINT check_access_code_status 
CHECK (access_code_status IN ('new', 'verified'));