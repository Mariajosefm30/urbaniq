-- Add new fields for enhanced security and time windows
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMP WITH TIME ZONE;

-- Update valid_from for existing guests (12 hours before arrival)
UPDATE public.guests
SET valid_from = arrival_at - INTERVAL '12 hours'
WHERE valid_from IS NULL;