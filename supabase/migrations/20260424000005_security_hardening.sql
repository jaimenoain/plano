-- Security Hardening: Database Level Security
-- 1. RLS for Updates on buildings table: Allow Creator OR Admin
-- 2. Data Integrity: Enforce rating 1-5 on user_buildings

-- 1. Update RLS Policy for buildings
-- First, drop the existing policy if it exists (to be safe and replace it)
DROP POLICY IF EXISTS "Users can update their own buildings" ON buildings;
DROP POLICY IF EXISTS "Users can update buildings" ON buildings;

-- Create the new policy that includes admin check
-- We inline the admin check to ensure this migration is self-contained
CREATE POLICY "Users can update buildings"
    ON buildings
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Data Integrity for user_buildings rating
-- Drop existing constraint to ensure we are setting it correctly
ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS user_buildings_rating_check;

-- Add the strict 1-5 constraint (allowing NULL as ratings are optional)
ALTER TABLE user_buildings
    ADD CONSTRAINT user_buildings_rating_check
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
