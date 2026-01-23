-- Add administration columns to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
