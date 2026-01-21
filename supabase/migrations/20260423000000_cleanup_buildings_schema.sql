-- Remove unused 'architect' column from buildings table
ALTER TABLE buildings DROP COLUMN IF EXISTS architect;
