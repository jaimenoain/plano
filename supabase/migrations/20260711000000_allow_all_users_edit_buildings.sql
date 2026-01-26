-- Migration: Allow all authenticated users to edit buildings and their relations

-- 1. Buildings Table
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can update their own buildings" ON public.buildings;

-- Create new policy allowing any authenticated user to update
CREATE POLICY "Authenticated users can update buildings"
    ON public.buildings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Building Architects Table
-- Allow deletion (unlink) for all authenticated users
-- (INSERT is already covered by "Authenticated users can link architects")
CREATE POLICY "Authenticated users can unlink architects"
    ON public.building_architects
    FOR DELETE
    TO authenticated
    USING (true);

-- 3. Building Styles Table
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can delete their own building links" ON public.building_styles;

-- Create new policy allowing deletion for all authenticated users
CREATE POLICY "Authenticated users can unlink styles"
    ON public.building_styles
    FOR DELETE
    TO authenticated
    USING (true);

-- 4. Building Functional Typologies
-- Drop Admin-only policies
DROP POLICY IF EXISTS "Admin write access for building_functional_typologies" ON public.building_functional_typologies;
DROP POLICY IF EXISTS "Admin delete access for building_functional_typologies" ON public.building_functional_typologies;

-- Allow Authenticated users to INSERT and DELETE
CREATE POLICY "Authenticated users can link typologies"
    ON public.building_functional_typologies
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can unlink typologies"
    ON public.building_functional_typologies
    FOR DELETE
    TO authenticated
    USING (true);

-- 5. Building Attributes
-- Drop Admin-only policies
DROP POLICY IF EXISTS "Admin write access for building_attributes" ON public.building_attributes;
DROP POLICY IF EXISTS "Admin delete access for building_attributes" ON public.building_attributes;

-- Allow Authenticated users to INSERT and DELETE
CREATE POLICY "Authenticated users can link attributes"
    ON public.building_attributes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can unlink attributes"
    ON public.building_attributes
    FOR DELETE
    TO authenticated
    USING (true);
