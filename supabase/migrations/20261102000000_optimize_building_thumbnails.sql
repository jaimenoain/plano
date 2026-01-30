-- Add community_preview_url column to buildings
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS community_preview_url text;

-- Function to calculate and update the winning image
CREATE OR REPLACE FUNCTION update_building_community_preview(p_building_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE buildings
    SET community_preview_url = (
        SELECT ri.storage_path
        FROM review_images ri
        JOIN user_buildings ub ON ri.review_id = ub.id
        WHERE ub.building_id = p_building_id
        ORDER BY ri.likes_count DESC, ri.created_at DESC
        LIMIT 1
    )
    WHERE id = p_building_id;
END;
$$;

-- Trigger function for review_images changes
CREATE OR REPLACE FUNCTION tr_update_community_preview_from_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_building_id UUID;
BEGIN
    -- Determine the building_id.
    -- For DELETE, we use OLD. For INSERT/UPDATE, we use NEW.

    IF TG_OP = 'DELETE' THEN
        SELECT building_id INTO v_building_id FROM user_buildings WHERE id = OLD.review_id;
    ELSE
        SELECT building_id INTO v_building_id FROM user_buildings WHERE id = NEW.review_id;
    END IF;

    -- Only update if we found a building
    IF v_building_id IS NOT NULL THEN
        PERFORM update_building_community_preview(v_building_id);
    END IF;

    RETURN NULL;
END;
$$;

-- Trigger for review_images
DROP TRIGGER IF EXISTS on_review_image_change ON review_images;
CREATE TRIGGER on_review_image_change
AFTER INSERT OR DELETE OR UPDATE OF likes_count ON review_images
FOR EACH ROW
EXECUTE FUNCTION tr_update_community_preview_from_image();


-- Trigger function for user_buildings changes (specifically DELETE or moving buildings)
CREATE OR REPLACE FUNCTION tr_update_community_preview_from_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_building_community_preview(OLD.building_id);
    ELSIF TG_OP = 'UPDATE' THEN
        -- If building_id changed, update both old and new
        IF OLD.building_id IS DISTINCT FROM NEW.building_id THEN
            PERFORM update_building_community_preview(OLD.building_id);
            PERFORM update_building_community_preview(NEW.building_id);
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

-- Trigger for user_buildings
DROP TRIGGER IF EXISTS on_user_building_change ON user_buildings;
CREATE TRIGGER on_user_building_change
AFTER DELETE OR UPDATE OF building_id ON user_buildings
FOR EACH ROW
EXECUTE FUNCTION tr_update_community_preview_from_review();


-- Update the existing main_image_url helper function to be O(1)
CREATE OR REPLACE FUNCTION main_image_url(b buildings)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(b.hero_image_url, b.community_preview_url);
$$;

-- Backfill existing data
DO $$
DECLARE
    r RECORD;
BEGIN
    -- We only need to check buildings that don't have a hero_image_url,
    -- or we can just update all of them to be sure community_preview_url is populated.
    -- Populating it is useful even if hero_image_url exists (in case hero image is removed later).
    FOR r IN SELECT id FROM buildings LOOP
        PERFORM update_building_community_preview(r.id);
    END LOOP;
END;
$$;
