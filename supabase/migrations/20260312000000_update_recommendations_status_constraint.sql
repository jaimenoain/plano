ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_status_check;
ALTER TABLE recommendations ADD CONSTRAINT recommendations_status_check CHECK (status IN ('pending', 'accepted', 'ignored', 'watch_with'));
