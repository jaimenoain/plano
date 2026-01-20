-- 1. Fix Buildings Table
-- Add year_completed if it doesn't exist
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS year_completed INTEGER;

-- Drop architect column if it exists (enforce plural architects)
ALTER TABLE buildings DROP COLUMN IF EXISTS architect;

-- 2. Enforce Status Enum
-- Create the enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_building_status') THEN
        CREATE TYPE user_building_status AS ENUM ('pending', 'visited', 'did_not_finish');
    END IF;
END $$;

-- Drop the existing check constraint on status
ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS user_buildings_status_check;

-- Alter the status column to use the enum
-- We must drop the default first to avoid "default for column cannot be cast automatically" error
-- Then we alter the type with a cast
-- Finally we restore the default with the correct enum type
ALTER TABLE user_buildings
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE user_building_status USING status::user_building_status,
  ALTER COLUMN status SET DEFAULT 'pending'::user_building_status;
