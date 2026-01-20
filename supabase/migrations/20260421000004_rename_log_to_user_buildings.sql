DO $$
BEGIN
  -- Rename table if it exists and new name doesn't
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'log') AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_buildings') THEN
    ALTER TABLE log RENAME TO user_buildings;
  END IF;

  -- Rename columns in buildings if they exist with old names
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'year') THEN
    ALTER TABLE buildings RENAME COLUMN year TO year_completed;
  END IF;

  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'image_url') THEN
    ALTER TABLE buildings RENAME COLUMN image_url TO main_image_url;
  END IF;

  -- Rename column in user_buildings if it exists with old name
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_buildings' AND column_name = 'watched_at') THEN
    ALTER TABLE user_buildings RENAME COLUMN watched_at TO visited_at;
  END IF;
END $$;

-- Migrate data (safe to run multiple times as it targets specific values)
UPDATE user_buildings SET status = 'pending' WHERE status = 'watchlist';
UPDATE user_buildings SET status = 'visited' WHERE status = 'watched';
UPDATE user_buildings SET status = 'visited' WHERE status = 'review';
UPDATE user_buildings SET status = 'pending' WHERE status = 'watch_with';

-- Clean up other statuses
UPDATE user_buildings SET status = 'pending' WHERE status NOT IN ('pending', 'visited');

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_buildings_status_check') THEN
    ALTER TABLE user_buildings ADD CONSTRAINT user_buildings_status_check CHECK (status IN ('pending', 'visited'));
  END IF;
END $$;
