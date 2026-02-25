-- 1. Create architect_claims table
CREATE TABLE IF NOT EXISTS public.architect_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    architect_id UUID NOT NULL REFERENCES public.architects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    proof_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Unique index for one active claim
CREATE UNIQUE INDEX architect_claims_one_active_idx
    ON public.architect_claims (user_id, architect_id)
    WHERE status IN ('pending', 'verified');

-- Enable RLS
ALTER TABLE public.architect_claims ENABLE ROW LEVEL SECURITY;

-- Policies for architect_claims
CREATE POLICY "Users can insert their own claims"
    ON public.architect_claims FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own claims"
    ON public.architect_claims FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can update claims"
    ON public.architect_claims FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 2. Update review_images table
ALTER TABLE public.review_images
ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;

-- 3. Update buildings table
ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS hero_image_id UUID REFERENCES public.review_images(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS architect_statement TEXT;

-- 4. Helper function for verification check
CREATE OR REPLACE FUNCTION public.is_verified_architect_for_building(user_uuid UUID, building_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check junction table building_architects (from 20260505000000_add_architects_table.sql)
  RETURN EXISTS (
    SELECT 1
    FROM public.building_architects ba
    JOIN public.architect_claims ac ON ba.architect_id = ac.architect_id
    WHERE ba.building_id = building_uuid
    AND ac.user_id = user_uuid
    AND ac.status = 'verified'
  );
END;
$$;

-- 5. RLS for buildings (Update)
-- Allow verified architects to update their buildings
CREATE POLICY "Verified architects can update their buildings"
    ON public.buildings FOR UPDATE
    TO authenticated
    USING (public.is_verified_architect_for_building(auth.uid(), id));

-- Trigger to protect official fields in buildings
CREATE OR REPLACE FUNCTION public.check_building_official_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_architect BOOLEAN;
BEGIN
    -- Check if verified architect
    is_architect := public.is_verified_architect_for_building(auth.uid(), NEW.id);

    -- 1. If Admin, allow everything
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- 2. If Verified Architect (and NOT Admin, NOT Creator)
    -- We must ensure they only change hero_image_id or architect_statement
    -- Note: Creators are handled by separate RLS policy but if they are ALSO architects,
    -- they should have full access via creator rights.
    -- However, RLS policies are permissive. If "Users can update their own buildings" passes, they can update.
    -- This trigger restricts based on logic.

    IF is_architect AND (auth.uid() != OLD.created_by) THEN
        -- Check if any field OTHER than hero_image_id, architect_statement, updated_at changed
        -- We use to_jsonb to compare all other columns safely without listing them all.
        -- We remove the allowed columns from the comparison.
        IF (to_jsonb(NEW) - 'hero_image_id' - 'architect_statement' - 'updated_at') IS DISTINCT FROM
           (to_jsonb(OLD) - 'hero_image_id' - 'architect_statement' - 'updated_at') THEN
            RAISE EXCEPTION 'Verified architects can only update official fields (hero_image_id, architect_statement).';
        END IF;

        -- If we are here, only official fields changed (or nothing changed). Allow.
        RETURN NEW;
    END IF;

    -- 3. If Verified Architect (and Creator)
    -- They are allowed to edit everything (as creator) + official fields (as architect).
    IF is_architect THEN
        RETURN NEW;
    END IF;

    -- 4. If NOT Verified Architect (and NOT Admin)
    -- They shouldn't be able to touch official fields.
    -- This covers creators who are not verified architects.
    IF (NEW.hero_image_id IS DISTINCT FROM OLD.hero_image_id) OR
       (NEW.architect_statement IS DISTINCT FROM OLD.architect_statement) THEN
        RAISE EXCEPTION 'Only verified architects or admins can update official building data.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_building_official_fields
    BEFORE UPDATE ON public.buildings
    FOR EACH ROW
    EXECUTE FUNCTION public.check_building_official_update();


-- 6. RLS for review_images (Update)
-- Allow verified architects to update review_images (for is_official)
CREATE POLICY "Verified architects can update review images"
    ON public.review_images FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_buildings ub
            WHERE ub.id = review_images.review_id
            AND public.is_verified_architect_for_building(auth.uid(), ub.building_id)
        )
    );

-- Trigger to protect is_official and restrict architects from touching other fields
CREATE OR REPLACE FUNCTION public.check_review_image_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_architect BOOLEAN;
    building_uuid UUID;
BEGIN
    -- Get building id from user_buildings (renamed from log in 20260421000004)
    SELECT building_id INTO building_uuid FROM public.user_buildings WHERE id = NEW.review_id;

    -- Check if user is verified architect
    is_architect := public.is_verified_architect_for_building(auth.uid(), building_uuid);

    -- 1. Protect is_official flag
    IF (NEW.is_official IS DISTINCT FROM OLD.is_official) THEN
        IF NOT (public.is_admin() OR is_architect) THEN
            RAISE EXCEPTION 'Only verified architects or admins can update the is_official flag.';
        END IF;
    END IF;

    -- 2. Restrict architects (who are not owners/admins) from changing other fields
    IF is_architect AND NOT public.is_admin() AND (auth.uid() != OLD.user_id) THEN
        -- Architect can only update is_official. Check everything else using JSONB.
        IF (to_jsonb(NEW) - 'is_official' - 'updated_at') IS DISTINCT FROM
           (to_jsonb(OLD) - 'is_official' - 'updated_at') THEN
               RAISE EXCEPTION 'Architects can only update the is_official flag on community images.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_review_image_fields
    BEFORE UPDATE ON public.review_images
    FOR EACH ROW
    EXECUTE FUNCTION public.check_review_image_update();
