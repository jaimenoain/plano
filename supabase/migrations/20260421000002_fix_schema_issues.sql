-- 1. Add Missing Column to buildings
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS year INTEGER;

-- 2. Handle legacy data in log
-- Cap ratings at 5 if they are greater than 5
UPDATE log SET rating = 5 WHERE rating > 5;
-- Cap ratings at 1 if they are less than 1
UPDATE log SET rating = 1 WHERE rating < 1;

-- 3. Enforce Rating Scale
-- Remove existing constraint if it exists (to be idempotent)
ALTER TABLE log DROP CONSTRAINT IF EXISTS log_rating_check;

-- Add the new constraint
ALTER TABLE log ADD CONSTRAINT log_rating_check CHECK (rating >= 1 AND rating <= 5);
