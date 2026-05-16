-- =============================================================================
-- Migration: fix community_preview thumbnail trigger after building_posts
-- Purpose:   The original thumbnail trigger (20261102000000) found a building
--            via `review_images.review_id → user_buildings(id)`. Since
--            20270872000000 the FK now points at `building_posts(id)`, so the
--            trigger has been silently no-op'ing for every photo added to a
--            new-style note — community_preview_url stops updating.
--
-- Fix:       Re-point both the trigger function and the recompute function at
--            building_posts. Backfill all buildings so existing rows with
--            photos through the new path get a thumbnail.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_building_community_preview(p_building_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.buildings
    SET community_preview_url = (
        SELECT ri.storage_path
        FROM public.review_images ri
        JOIN public.building_posts bp ON ri.review_id = bp.id
        WHERE bp.building_id = p_building_id
        ORDER BY ri.likes_count DESC NULLS LAST, ri.created_at DESC NULLS LAST
        LIMIT 1
    )
    WHERE id = p_building_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_update_community_preview_from_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_building_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT building_id INTO v_building_id
          FROM public.building_posts
         WHERE id = OLD.review_id;
    ELSE
        SELECT building_id INTO v_building_id
          FROM public.building_posts
         WHERE id = NEW.review_id;
    END IF;

    IF v_building_id IS NOT NULL THEN
        PERFORM public.update_building_community_preview(v_building_id);
    END IF;

    RETURN NULL;
END;
$$;

-- Backfill: recompute community_preview_url for every building using the new
-- building_posts-aware logic. Buildings whose only photos were unreachable via
-- the old user_buildings join now get a thumbnail; rows that pointed at a
-- since-removed image get cleared.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.buildings LOOP
        PERFORM public.update_building_community_preview(r.id);
    END LOOP;
END;
$$;
