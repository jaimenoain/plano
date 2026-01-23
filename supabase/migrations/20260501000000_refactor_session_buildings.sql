-- Migration: Refactor session_buildings table
-- Description: Adds id and is_main columns, updates Primary Key, and ensures data integrity.

-- 1. Add new columns
-- 'id' with default gen_random_uuid() will automatically backfill existing rows with unique UUIDs.
ALTER TABLE session_buildings
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() NOT NULL,
ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;

-- 2. Drop existing composite primary key
-- Note: Assuming default naming convention "session_buildings_pkey" from the original CREATE TABLE statement
ALTER TABLE session_buildings
DROP CONSTRAINT IF EXISTS session_buildings_pkey;

-- 3. Set new primary key
ALTER TABLE session_buildings
ADD PRIMARY KEY (id);

-- 4. Add unique constraint to replace the old composite PK logic
-- This prevents duplicate buildings in the same session
ALTER TABLE session_buildings
ADD CONSTRAINT session_buildings_session_id_building_id_key UNIQUE (session_id, building_id);
