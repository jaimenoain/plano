-- Fix rating constraint to enforce 1-5 or NULL
ALTER TABLE user_buildings DROP CONSTRAINT IF EXISTS user_buildings_rating_check;
ALTER TABLE user_buildings ADD CONSTRAINT user_buildings_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
