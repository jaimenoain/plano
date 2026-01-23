-- Remove legacy TMDB columns if they exist
ALTER TABLE IF EXISTS poll_options DROP COLUMN IF EXISTS tmdb_id;
ALTER TABLE IF EXISTS polls DROP COLUMN IF EXISTS tmdb_id;
