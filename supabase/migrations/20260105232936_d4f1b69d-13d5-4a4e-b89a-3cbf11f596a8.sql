-- Add onboarding metadata fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS org_type TEXT,
ADD COLUMN IF NOT EXISTS primary_intent TEXT[],
ADD COLUMN IF NOT EXISTS unit_count INTEGER,
ADD COLUMN IF NOT EXISTS current_tool TEXT,
ADD COLUMN IF NOT EXISTS org_onboarding_completed BOOLEAN DEFAULT false;

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding_completed 
ON public.organizations(org_onboarding_completed);