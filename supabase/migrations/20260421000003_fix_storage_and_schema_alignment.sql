-- 1. Storage: building_images

-- Insert new bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('building_images', 'building_images', true)
ON CONFLICT (id) DO NOTHING;

-- Cleanup old bucket 'building-images' artifacts
-- Drop the policy created in 20260421000000_gut_and_remodel_for_buildings.sql
DROP POLICY IF EXISTS "Authenticated users can upload building images" ON storage.objects;

-- Remove the old bucket
DELETE FROM storage.buckets WHERE id = 'building-images';

-- Create policies for new bucket
-- We use DO blocks to avoid errors if policies already exist

-- Public Access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Building images are publicly accessible'
    ) THEN
        CREATE POLICY "Building images are publicly accessible"
            ON storage.objects FOR SELECT
            USING ( bucket_id = 'building_images' );
    END IF;
END $$;

-- Authenticated Upload
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload building images'
    ) THEN
        CREATE POLICY "Authenticated users can upload building images"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK ( bucket_id = 'building_images' );
    END IF;
END $$;

-- Authenticated Update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can update building images'
    ) THEN
        CREATE POLICY "Authenticated users can update building images"
            ON storage.objects FOR UPDATE
            TO authenticated
            USING ( bucket_id = 'building_images' );
    END IF;
END $$;

-- Authenticated Delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can delete building images'
    ) THEN
        CREATE POLICY "Authenticated users can delete building images"
            ON storage.objects FOR DELETE
            TO authenticated
            USING ( bucket_id = 'building_images' );
    END IF;
END $$;


-- 2. Schema Corrections: buildings table

-- Rename main_image_url to image_url if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'buildings' AND column_name = 'main_image_url'
    ) THEN
        ALTER TABLE buildings RENAME COLUMN main_image_url TO image_url;
    END IF;
END $$;

-- Ensure year column exists
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS year INTEGER;


-- 3. Data Integrity: log table

-- Drop existing constraint on rating
ALTER TABLE log DROP CONSTRAINT IF EXISTS log_rating_check;

-- Ensure rating is INTEGER
ALTER TABLE log ALTER COLUMN rating TYPE INTEGER USING rating::INTEGER;

-- Add strict constraint 1-5
ALTER TABLE log ADD CONSTRAINT log_rating_check CHECK (rating >= 1 AND rating <= 5);
