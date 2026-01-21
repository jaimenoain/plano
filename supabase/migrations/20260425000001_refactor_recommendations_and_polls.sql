-- Refactor recommendations table
-- 1. Rename film_id to building_id
-- 2. Update foreign key to reference buildings(id)

DO $$
BEGIN
    -- Rename column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendations' AND column_name = 'film_id') THEN
        ALTER TABLE public.recommendations RENAME COLUMN film_id TO building_id;
    END IF;

    -- Drop old constraint if it exists
    -- We attempt to drop standard naming conventions for the old key
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'recommendations_film_id_fkey') THEN
        ALTER TABLE public.recommendations DROP CONSTRAINT recommendations_film_id_fkey;
    END IF;

    -- Add new constraint if not exists (implicit by standard ADD CONSTRAINT failing if exists, but we want idempotency or clean run)
    -- Since this is a migration, usually run once. We will just add it.
    -- However, to be safe against re-runs if partial:
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'recommendations_building_id_fkey') THEN
        ALTER TABLE public.recommendations
            ADD CONSTRAINT recommendations_building_id_fkey
            FOREIGN KEY (building_id)
            REFERENCES public.buildings(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- Clean up poll_options table
-- Remove tmdb_id column
ALTER TABLE public.poll_options DROP COLUMN IF EXISTS tmdb_id;
