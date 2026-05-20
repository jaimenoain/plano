-- Fix: ambassador photo/building approvals fail for images/buildings where the
-- moderating ambassador is also a verified architect for that building.
--
-- Root cause: protect_review_image_fields (BEFORE UPDATE on review_images) and
-- protect_building_official_fields (BEFORE UPDATE on buildings) guard against
-- verified architects editing fields beyond their allowed set. The JSONB comparison
-- excluded only 'is_official'/'updated_at' (images) and
-- 'hero_image_id'/'architect_statement'/'updated_at' (buildings).
-- ambassador_approve_photo() sets moderated_at + moderated_by on review_images;
-- ambassador_approve_building() sets moderated_at + moderated_by on buildings.
-- Neither column was in the exclusion list, so the trigger raised
-- 'Architects can only update the is_official flag on community images.' → 400.
--
-- Fix: extend both exclusion lists with 'moderated_at' and 'moderated_by' so
-- ambassador moderation approvals are not blocked by the architect guard.
-- Feedback id: 7643d28d-3e05-40be-b01b-4b7944974af7

-- ─── 1. review_images — extend JSONB exclusion list ──────────────────────────

CREATE OR REPLACE FUNCTION public.check_review_image_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
    is_architect BOOLEAN;
    building_uuid UUID;
BEGIN
    SELECT building_id INTO building_uuid
      FROM public.building_posts
     WHERE id = NEW.review_id;

    is_architect := public.is_verified_architect_for_building(auth.uid(), building_uuid);

    IF (NEW.is_official IS DISTINCT FROM OLD.is_official) THEN
        IF NOT (public.is_admin() OR is_architect) THEN
            RAISE EXCEPTION 'Only verified architects or admins can update the is_official flag.';
        END IF;
    END IF;

    IF is_architect AND NOT public.is_admin() AND (auth.uid() != OLD.user_id) THEN
        IF (to_jsonb(NEW) - 'is_official' - 'updated_at' - 'moderated_at' - 'moderated_by') IS DISTINCT FROM
           (to_jsonb(OLD) - 'is_official' - 'updated_at' - 'moderated_at' - 'moderated_by') THEN
               RAISE EXCEPTION 'Architects can only update the is_official flag on community images.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ─── 2. buildings — extend JSONB exclusion list ───────────────────────────────

CREATE OR REPLACE FUNCTION public.check_building_official_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
    is_architect BOOLEAN;
BEGIN
    is_architect := public.is_verified_architect_for_building(auth.uid(), NEW.id);

    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF is_architect AND (auth.uid() != OLD.created_by) THEN
        IF (to_jsonb(NEW) - 'hero_image_id' - 'architect_statement' - 'updated_at' - 'moderated_at' - 'moderated_by') IS DISTINCT FROM
           (to_jsonb(OLD) - 'hero_image_id' - 'architect_statement' - 'updated_at' - 'moderated_at' - 'moderated_by') THEN
            RAISE EXCEPTION 'Verified architects can only update official fields (hero_image_id, architect_statement).';
        END IF;
        RETURN NEW;
    END IF;

    IF is_architect THEN
        RETURN NEW;
    END IF;

    IF (NEW.hero_image_id IS DISTINCT FROM OLD.hero_image_id) OR
       (NEW.architect_statement IS DISTINCT FROM OLD.architect_statement) THEN
        RAISE EXCEPTION 'Only verified architects or admins can update official building data.';
    END IF;

    RETURN NEW;
END;
$$;
