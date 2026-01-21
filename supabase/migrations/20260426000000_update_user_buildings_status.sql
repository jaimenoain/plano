-- Migration to standardise user_buildings status column

-- 1. Drop existing constraint
ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS user_buildings_status_check;

-- 2. Update existing data
-- Map legacy values if they exist
UPDATE user_buildings SET status = 'pending' WHERE status = 'watchlist';
UPDATE user_buildings SET status = 'visited' WHERE status = 'watched';
UPDATE user_buildings SET status = 'ignored' WHERE status = 'dropped';

-- Ensure all rows have valid status before applying new constraint
-- Any other status (including potential 'pending' that was formerly 'dropped' if indistinguishable) remains as is
-- unless it violates the new constraint.
-- If there are any other values not in ('pending', 'visited', 'ignored'), convert them to default 'visited'
UPDATE user_buildings SET status = 'visited' WHERE status NOT IN ('pending', 'visited', 'ignored');

-- 3. Add new constraint
ALTER TABLE user_buildings ADD CONSTRAINT user_buildings_status_check CHECK (status IN ('pending', 'visited', 'ignored'));

-- 4. Set default value
ALTER TABLE user_buildings ALTER COLUMN status SET DEFAULT 'visited';
