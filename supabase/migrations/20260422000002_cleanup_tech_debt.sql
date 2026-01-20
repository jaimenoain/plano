-- 1. Rename Foreign Keys
-- Rename foreign keys on user_buildings table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'log_building_id_fkey') THEN
        ALTER TABLE user_buildings RENAME CONSTRAINT log_building_id_fkey TO user_buildings_building_id_fkey;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'log_user_id_fkey') THEN
        ALTER TABLE user_buildings RENAME CONSTRAINT log_user_id_fkey TO user_buildings_user_id_fkey;
    END IF;
END $$;

-- Rename foreign keys on comments table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_log_id_fkey') THEN
        ALTER TABLE comments RENAME CONSTRAINT comments_log_id_fkey TO comments_user_building_id_fkey;
    END IF;
END $$;

-- 2. Verify Rating Check
-- Ensure a CHECK constraint exists on user_buildings.rating to enforce the 1-5 integer scale (or NULL)
-- This is a redundancy check as it was likely added in 20260422000000_fix_rating_constraint.sql
DO $$
BEGIN
    -- Only add if it doesn't exist, though we could drop and recreate to be sure.
    -- Let's stick to ensuring it exists.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_buildings_rating_check') THEN
        ALTER TABLE user_buildings ADD CONSTRAINT user_buildings_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
    END IF;
END $$;
