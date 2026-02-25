-- Add architect_statement column to buildings table if it doesn't exist
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS architect_statement TEXT;
