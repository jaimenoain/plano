-- Add onboarding fields to ambassador_memberships
ALTER TABLE public.ambassador_memberships 
  ADD COLUMN IF NOT EXISTS contributor_type text CHECK (contributor_type IN ('researcher', 'photographer', 'outreach', 'all')),
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Update RLS if needed (already allows select for authenticated)
