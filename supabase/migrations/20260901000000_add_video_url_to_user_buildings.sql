-- Add video_url column to user_buildings table to store reference to uploaded video
ALTER TABLE public.user_buildings
ADD COLUMN IF NOT EXISTS video_url TEXT;
