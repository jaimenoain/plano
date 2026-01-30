-- Add new columns for building details
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS access_type TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS typology TEXT[];
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS materials TEXT[];
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS status TEXT;
