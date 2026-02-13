-- Fix orphaned user_buildings records pointing to deleted buildings
-- This function finds records where building_id points to a deleted building that has merged_into_id set.

CREATE OR REPLACE FUNCTION fix_orphaned_user_buildings()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    r RECORD;
    target_ub_id UUID;
    fixed_count INTEGER := 0;
BEGIN
    -- Iterate over orphaned records
    FOR r IN
        SELECT ub.id, ub.user_id, ub.building_id, ub.content, ub.rating, b.merged_into_id
        FROM user_buildings ub
        JOIN buildings b ON ub.building_id = b.id
        WHERE b.is_deleted = true AND b.merged_into_id IS NOT NULL
    LOOP
        -- Check if target record exists for this user
        SELECT id INTO target_ub_id
        FROM user_buildings
        WHERE user_id = r.user_id AND building_id = r.merged_into_id;

        IF target_ub_id IS NOT NULL THEN
            -- Target exists (Conflict).

            -- 1. Rescue content if target is empty/null
            UPDATE user_buildings
            SET content = r.content
            WHERE id = target_ub_id
            AND (content IS NULL OR content = '')
            AND (r.content IS NOT NULL AND r.content <> '');

            -- 2. Rescue rating if target is null
            UPDATE user_buildings
            SET rating = r.rating
            WHERE id = target_ub_id
            AND rating IS NULL
            AND r.rating IS NOT NULL;

            -- 3. Move review images to target
            -- Update review_images where review_id matches source id
            UPDATE review_images
            SET review_id = target_ub_id
            WHERE review_id = r.id;

            -- 4. Delete source record to resolve conflict
            DELETE FROM user_buildings WHERE id = r.id;
        ELSE
            -- Target does not exist. Safe to move.
            UPDATE user_buildings
            SET building_id = r.merged_into_id
            WHERE id = r.id;
        END IF;

        fixed_count := fixed_count + 1;
    END LOOP;

    RAISE NOTICE 'Fixed % orphaned user_buildings records.', fixed_count;
END;
$$;

-- Execute the fix immediately
SELECT fix_orphaned_user_buildings();
