-- Rename Foreign Keys if they exist with old names
DO $$
BEGIN
    -- Rename constraints on user_buildings table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'log_building_id_fkey') THEN
        ALTER TABLE user_buildings RENAME CONSTRAINT log_building_id_fkey TO user_buildings_building_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'log_group_id_fkey') THEN
        ALTER TABLE user_buildings RENAME CONSTRAINT log_group_id_fkey TO user_buildings_group_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'log_user_id_fkey') THEN
        ALTER TABLE user_buildings RENAME CONSTRAINT log_user_id_fkey TO user_buildings_user_id_fkey;
    END IF;

    -- Rename constraints on comments table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_log_id_fkey') THEN
        ALTER TABLE comments RENAME CONSTRAINT comments_log_id_fkey TO comments_user_building_id_fkey;
    END IF;

    -- Rename constraints on likes table
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_log_id_fkey') THEN
        ALTER TABLE likes RENAME CONSTRAINT likes_log_id_fkey TO likes_user_building_id_fkey;
    END IF;
END $$;

-- Drop 'film_id' if it exists in user_buildings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_buildings' AND column_name = 'film_id') THEN
        ALTER TABLE user_buildings DROP COLUMN film_id;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE user_buildings ENABLE ROW LEVEL SECURITY;

-- Drop potential old policies
DROP POLICY IF EXISTS "Users can view their own logs" ON user_buildings;
DROP POLICY IF EXISTS "Users can insert their own logs" ON user_buildings;
DROP POLICY IF EXISTS "Users can update their own logs" ON user_buildings;
DROP POLICY IF EXISTS "Users can delete their own logs" ON user_buildings;

-- Drop policies by new name to ensure clean slate
DROP POLICY IF EXISTS "Users can view their own user_buildings" ON user_buildings;
DROP POLICY IF EXISTS "Users can insert their own user_buildings" ON user_buildings;
DROP POLICY IF EXISTS "Users can update their own user_buildings" ON user_buildings;
DROP POLICY IF EXISTS "Users can delete their own user_buildings" ON user_buildings;
DROP POLICY IF EXISTS "Users can view public user_buildings" ON user_buildings;

-- Create new policies
-- Select: Users can view their own entries OR public entries
CREATE POLICY "Users can view user_buildings" ON user_buildings
    FOR SELECT
    USING ( (auth.uid() = user_id) OR (visibility = 'public') );

-- Insert: Users can insert their own entries
CREATE POLICY "Users can insert their own user_buildings" ON user_buildings
    FOR INSERT
    WITH CHECK ( auth.uid() = user_id );

-- Update: Users can update their own entries
CREATE POLICY "Users can update their own user_buildings" ON user_buildings
    FOR UPDATE
    USING ( auth.uid() = user_id );

-- Delete: Users can delete their own entries
CREATE POLICY "Users can delete their own user_buildings" ON user_buildings
    FOR DELETE
    USING ( auth.uid() = user_id );
