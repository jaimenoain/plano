-- Enable RLS on public.spatial_ref_sys
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
-- Drop the policy first to ensure idempotency
DROP POLICY IF EXISTS "Allow public read access on spatial_ref_sys" ON public.spatial_ref_sys;
CREATE POLICY "Allow public read access on spatial_ref_sys" ON public.spatial_ref_sys
    FOR SELECT
    TO public
    USING (true);
