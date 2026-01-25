-- Fix missing unique constraint on user_buildings that causes upsert to fail

-- 1. Remove duplicate entries, keeping the most recently edited/created one
DELETE FROM public.user_buildings
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, building_id
             ORDER BY edited_at DESC NULLS LAST, created_at DESC
           ) as rnum
    FROM public.user_buildings
  ) t
  WHERE t.rnum > 1
);

-- 2. Add the unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_buildings_user_id_building_id_key'
    ) THEN
        ALTER TABLE public.user_buildings
        ADD CONSTRAINT user_buildings_user_id_building_id_key UNIQUE (user_id, building_id);
    END IF;
END $$;
