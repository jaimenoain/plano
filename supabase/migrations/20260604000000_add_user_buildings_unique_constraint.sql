-- Fix missing unique constraint on user_buildings

-- 1. Deduplicate existing records
-- Keep the record with the most recent update (edited_at or created_at)
DELETE FROM user_buildings
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, building_id
            ORDER BY COALESCE(edited_at, created_at) DESC, id DESC
        ) as r_num
        FROM user_buildings
    ) t
    WHERE t.r_num > 1
);

-- 2. Add the unique constraint
ALTER TABLE user_buildings
ADD CONSTRAINT user_buildings_user_id_building_id_key
UNIQUE (user_id, building_id);
