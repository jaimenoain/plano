-- Fix any out of bounds ratings first
UPDATE public.user_buildings
SET rating = 5
WHERE rating > 5;

UPDATE public.user_buildings
SET rating = NULL
WHERE rating < 1;

-- Add check constraint (dropping existing one if it exists to be safe)
ALTER TABLE public.user_buildings
DROP CONSTRAINT IF EXISTS user_buildings_rating_check;

ALTER TABLE public.user_buildings
ADD CONSTRAINT user_buildings_rating_check
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
