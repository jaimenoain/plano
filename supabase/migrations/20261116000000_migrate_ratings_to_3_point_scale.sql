-- Migration to 3-point rating scale
DO $$
BEGIN
    -- 1. Update data in user_buildings
    -- Map existing ratings:
    -- 5 -> 3
    -- 4 -> 2
    -- 3 -> 1
    -- 2 -> NULL
    -- 1 -> NULL
    UPDATE public.user_buildings
    SET rating = CASE
        WHEN rating = 5 THEN 3
        WHEN rating = 4 THEN 2
        WHEN rating = 3 THEN 1
        WHEN rating <= 2 THEN NULL
        ELSE NULL -- Fallback for safety, though constraint prevented > 5
    END
    WHERE rating IS NOT NULL;

    -- 2. Update Check Constraint
    -- Drop the old constraint
    ALTER TABLE public.user_buildings
    DROP CONSTRAINT IF EXISTS user_buildings_rating_check;

    -- Add the new constraint (1-3)
    ALTER TABLE public.user_buildings
    ADD CONSTRAINT user_buildings_rating_check
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 3));

END $$;
