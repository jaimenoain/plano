-- Fix RLS policies for building junction tables to allow owners to edit

-- 1. building_architects
-- Drop existing insert policy to replace or keep it?
-- Existing: "Authenticated users can link architects" - check(auth.role() = 'authenticated')
-- This allows anyone to link architects to ANY building! This is insecure.
-- I should restrict it to building owners or admins.

DROP POLICY IF EXISTS "Authenticated users can link architects" ON public.building_architects;

CREATE POLICY "Building owners can insert architects"
    ON public.building_architects
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.buildings b
            WHERE b.id = building_id
            AND (b.created_by = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Building owners can delete architects"
    ON public.building_architects
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.buildings b
            WHERE b.id = building_id
            AND (b.created_by = auth.uid() OR public.is_admin())
        )
    );

-- 2. building_functional_typologies
-- Drop Admin-only policies

DROP POLICY IF EXISTS "Admin write access for building_functional_typologies" ON public.building_functional_typologies;
DROP POLICY IF EXISTS "Admin delete access for building_functional_typologies" ON public.building_functional_typologies;

CREATE POLICY "Building owners can insert typologies"
    ON public.building_functional_typologies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.buildings b
            WHERE b.id = building_id
            AND (b.created_by = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Building owners can delete typologies"
    ON public.building_functional_typologies
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.buildings b
            WHERE b.id = building_id
            AND (b.created_by = auth.uid() OR public.is_admin())
        )
    );

-- 3. building_attributes
-- Drop Admin-only policies

DROP POLICY IF EXISTS "Admin write access for building_attributes" ON public.building_attributes;
DROP POLICY IF EXISTS "Admin delete access for building_attributes" ON public.building_attributes;

CREATE POLICY "Building owners can insert attributes"
    ON public.building_attributes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.buildings b
            WHERE b.id = building_id
            AND (b.created_by = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Building owners can delete attributes"
    ON public.building_attributes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.buildings b
            WHERE b.id = building_id
            AND (b.created_by = auth.uid() OR public.is_admin())
        )
    );

-- 4. building_styles
-- Assuming it exists and has similar issues.

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'building_styles') THEN
        -- Drop potentially insecure or restrictive policies
        DROP POLICY IF EXISTS "Authenticated users can link styles" ON public.building_styles;
        -- (Add others if known)

        CREATE POLICY "Building owners can insert styles"
            ON public.building_styles
            FOR INSERT
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.buildings b
                    WHERE b.id = building_id
                    AND (b.created_by = auth.uid() OR public.is_admin())
                )
            );

        CREATE POLICY "Building owners can delete styles"
            ON public.building_styles
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM public.buildings b
                    WHERE b.id = building_id
                    AND (b.created_by = auth.uid() OR public.is_admin())
                )
            );
    END IF;
END $$;
