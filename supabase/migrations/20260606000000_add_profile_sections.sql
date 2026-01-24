ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_sections JSONB DEFAULT '{"favorites": false, "highlights": false}'::jsonb;
