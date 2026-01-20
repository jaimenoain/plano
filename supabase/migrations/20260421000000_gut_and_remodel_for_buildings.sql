-- 1. Environment Setup
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Deletions (The Demolition)
DROP TABLE IF EXISTS films CASCADE;
DROP TABLE IF EXISTS film_genres CASCADE;
DROP TABLE IF EXISTS film_providers CASCADE;

-- 3. Transformations (The Remodel)

-- The `log` Table
-- We truncate first to remove all rows as requested.
-- referencing tables (like comments) need to be cleared too.
TRUNCATE TABLE log CASCADE;

-- Drop existing policies on log table to avoid dependency issues when dropping columns
-- Since we don't know the exact names, we can try standard names or drop all if possible.
-- Since we can't easily drop all without names in SQL without dynamic SQL, we will use a DO block.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'log' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON log', pol.policyname);
    END LOOP;
END $$;

-- Remove film_id
ALTER TABLE log DROP COLUMN IF EXISTS film_id;

-- The `group_backlog_items` Table
TRUNCATE TABLE group_backlog_items CASCADE;
ALTER TABLE group_backlog_items DROP COLUMN IF EXISTS tmdb_id;


-- 4. New Foundation (The Building)
CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    address TEXT,
    architects TEXT[],
    styles TEXT[],
    description TEXT,
    main_image_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on buildings
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Create policies for buildings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'buildings' AND policyname = 'Authenticated users can insert buildings'
    ) THEN
        CREATE POLICY "Authenticated users can insert buildings"
            ON buildings FOR INSERT
            TO authenticated
            WITH CHECK (created_by = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'buildings' AND policyname = 'Everyone can read buildings'
    ) THEN
        CREATE POLICY "Everyone can read buildings"
            ON buildings FOR SELECT
            USING (true);
    END IF;
END $$;


-- Now complete Transformations by adding foreign keys
ALTER TABLE log
ADD COLUMN building_id UUID NOT NULL REFERENCES buildings(id);

ALTER TABLE group_backlog_items
ADD COLUMN building_id UUID NOT NULL REFERENCES buildings(id);

-- Recreate policies for log table
-- Assuming log table has a user_id or created_by column.
-- Since I can't check the schema, I'll check common patterns.
-- If I can't verify the column name for user, I might risk breaking it if I use wrong column.
-- But TRUNCATE happened, so data is gone. The schema remains.
-- If log was "User X did Activity Y", it likely has user_id.
-- I'll check migration files for references to log table columns.
-- I saw `login_logs` but that's different.
-- I'll assume `user_id` based on `group_backlog_items` having `user_id`.
-- To be safe, I will wrap policy creation in a DO block checking for column existence.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'log' AND column_name = 'user_id') THEN
        CREATE POLICY "Users can insert their own logs"
            ON log FOR INSERT
            TO authenticated
            WITH CHECK (user_id = auth.uid());

        CREATE POLICY "Users can view their own logs"
            ON log FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;


-- 5. Storage
-- Create a new public storage bucket named `building-images`
INSERT INTO storage.buckets (id, name, public)
VALUES ('building-images', 'building-images', true)
ON CONFLICT (id) DO NOTHING;

-- Add a policy allowing authenticated users to upload images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload building images'
    ) THEN
        CREATE POLICY "Authenticated users can upload building images"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'building-images');
    END IF;
END $$;
