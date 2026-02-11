-- Analysis Script: Verify Ranking System Performance
-- Run this script in your SQL editor or via psql to verify performance requirements.

-- =================================================================================================
-- 1. Index Verification
-- Verify that the new columns have appropriate indexes to support O(1) lookups and efficient sorting.
-- =================================================================================================

DO $$
BEGIN
    RAISE NOTICE '---------------------------------------------------------------------------------';
    RAISE NOTICE '1. Index Verification';
    RAISE NOTICE '---------------------------------------------------------------------------------';
END $$;

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'buildings'
AND (
    indexname = 'idx_buildings_popularity_score' OR
    indexname = 'idx_buildings_tier_rank' OR
    indexname = 'buildings_popularity_score_idx' OR
    indexname = 'buildings_tier_rank_idx'
);

-- =================================================================================================
-- 2. Trigger Overhead Analysis
-- Measure the execution time of an INSERT into user_buildings for a popular building vs standard.
-- This verifies that the real-time scoring trigger doesn't introduce perceptible lag.
-- =================================================================================================

DO $$
DECLARE
    -- Popular Building (Many Ratings)
    v_pop_user_id UUID;
    v_pop_building_id UUID;
    v_pop_rating INTEGER;
    v_pop_status TEXT;
    v_pop_start_time TIMESTAMPTZ;
    v_pop_end_time TIMESTAMPTZ;
    v_pop_duration_ms DOUBLE PRECISION;

    -- Standard Building (Few Ratings)
    v_std_user_id UUID;
    v_std_building_id UUID;
    v_std_rating INTEGER;
    v_std_status TEXT;
    v_std_start_time TIMESTAMPTZ;
    v_std_end_time TIMESTAMPTZ;
    v_std_duration_ms DOUBLE PRECISION;

BEGIN
    RAISE NOTICE '---------------------------------------------------------------------------------';
    RAISE NOTICE '2. Trigger Overhead Analysis';
    RAISE NOTICE '---------------------------------------------------------------------------------';

    -- A. Popular Building Test Case
    -- ---------------------------
    SELECT user_id, building_id, rating, status
    INTO v_pop_user_id, v_pop_building_id, v_pop_rating, v_pop_status
    FROM user_buildings
    WHERE building_id IN (
        SELECT building_id FROM user_buildings GROUP BY building_id ORDER BY count(*) DESC LIMIT 1
    )
    LIMIT 1;

    IF v_pop_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing Popular Building ID: %', v_pop_building_id;

        -- Delete to clear state (trigger runs, ignore time)
        DELETE FROM user_buildings WHERE user_id = v_pop_user_id AND building_id = v_pop_building_id;

        -- Measure INSERT
        v_pop_start_time := clock_timestamp();
        INSERT INTO user_buildings (user_id, building_id, rating, status)
        VALUES (v_pop_user_id, v_pop_building_id, v_pop_rating, v_pop_status);
        v_pop_end_time := clock_timestamp();

        v_pop_duration_ms := 1000 * (extract(epoch from v_pop_end_time) - extract(epoch from v_pop_start_time));
        RAISE NOTICE '  -> Time to INSERT (Popular): % ms', v_pop_duration_ms;
    ELSE
        RAISE NOTICE 'Skipping Popular Building Test: No suitable data found.';
        v_pop_duration_ms := 0;
    END IF;

    -- B. Standard Building Test Case
    -- ----------------------------
    SELECT user_id, building_id, rating, status
    INTO v_std_user_id, v_std_building_id, v_std_rating, v_std_status
    FROM user_buildings
    WHERE building_id IN (
        SELECT building_id FROM user_buildings GROUP BY building_id HAVING count(*) < 5 LIMIT 1
    )
    LIMIT 1;

    IF v_std_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing Standard Building ID: %', v_std_building_id;

        -- Delete to clear state
        DELETE FROM user_buildings WHERE user_id = v_std_user_id AND building_id = v_std_building_id;

        -- Measure INSERT
        v_std_start_time := clock_timestamp();
        INSERT INTO user_buildings (user_id, building_id, rating, status)
        VALUES (v_std_user_id, v_std_building_id, v_std_rating, v_std_status);
        v_std_end_time := clock_timestamp();

        v_std_duration_ms := 1000 * (extract(epoch from v_std_end_time) - extract(epoch from v_std_start_time));
        RAISE NOTICE '  -> Time to INSERT (Standard): % ms', v_std_duration_ms;
    ELSE
        RAISE NOTICE 'Skipping Standard Building Test: No suitable data found.';
    END IF;

    -- Verification Logic
    IF v_pop_duration_ms > 100 THEN
        RAISE WARNING 'Popular building update took > 100ms! Optimization required.';
    ELSE
        RAISE NOTICE 'Performance is within acceptable limits.';
    END IF;

    -- Always Rollback
    RAISE EXCEPTION 'Test completed successfully. Rolling back changes.';

EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Test completed successfully. Rolling back changes.' THEN
        RAISE NOTICE 'Test completed and changes rolled back.';
    ELSE
        RAISE NOTICE 'Error during test: %', SQLERRM;
        RAISE;
    END IF;
END $$;

-- =================================================================================================
-- 3. Read Performance Analysis
-- Run EXPLAIN ANALYZE on get_map_clusters_v2 to ensure efficient index usage.
-- We simulate a map view over New York City at Zoom Level 14 (showing individual pins).
-- =================================================================================================

DO $$
BEGIN
    RAISE NOTICE '---------------------------------------------------------------------------------';
    RAISE NOTICE '3. Read Performance Analysis (get_map_clusters_v2)';
    RAISE NOTICE '---------------------------------------------------------------------------------';
END $$;

EXPLAIN ANALYZE
SELECT * FROM get_map_clusters_v2(
    40.477399,   -- min_lat
    -74.25909,   -- min_lng
    40.917577,   -- max_lat
    -73.700272,  -- max_lng
    14,          -- zoom_level (shows individual pins, retrieving popularity_score and tier_rank)
    '{}'::jsonb  -- filters
);
