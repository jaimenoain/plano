-- Migration: Allow authenticated users to create functional typologies
-- Description: Updates RLS policies to allow authenticated users to insert new functional typologies.

-- Create new policy allowing authenticated users to insert
-- Note: We do not drop the existing Admin policy as it may be useful/redundant but harmless.
CREATE POLICY "Authenticated users can create functional_typologies"
    ON public.functional_typologies
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
