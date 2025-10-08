-- Add demo QR code columns to guests table
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS demo_code TEXT,
ADD COLUMN IF NOT EXISTS demo_code_status TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS demo_code_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demo_code_attempts INTEGER DEFAULT 0;

-- Add check constraint for demo_code_status
ALTER TABLE public.guests
ADD CONSTRAINT check_demo_code_status 
CHECK (demo_code_status IN ('new', 'verified'));