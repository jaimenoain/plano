-- Fix for update_group_stats 400 error
-- Ensures schema compatibility and robustness

-- 1. Ensure `styles` column exists in `buildings`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'buildings' AND column_name = 'styles'
    ) THEN
        ALTER TABLE buildings ADD COLUMN styles TEXT[];
    END IF;
END $$;

-- 2. Ensure `visited_at` column exists in `user_buildings`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_buildings' AND column_name = 'visited_at'
    ) THEN
        -- If watched_at exists, rename it. Otherwise add visited_at.
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_buildings' AND column_name = 'watched_at'
        ) THEN
            ALTER TABLE user_buildings RENAME COLUMN watched_at TO visited_at;
        ELSE
            ALTER TABLE user_buildings ADD COLUMN visited_at TIMESTAMPTZ;
        END IF;
    END IF;
END $$;

-- 3. Re-define calculate_scope_stats (Helper) to ensure signature matches
CREATE OR REPLACE FUNCTION calculate_scope_stats(
    p_group_id uuid,
    p_member_ids uuid[],
    p_filter_building_ids uuid[],
    p_session_dates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_vibe_metrics jsonb;
    v_avg_rating numeric;
    v_rating_count int;
    v_unique_building_count int;
BEGIN
    -- 1. Vibe Metrics
    -- Relies on temp_group_entries being present and populated
    WITH scope_entries AS (
        SELECT * FROM temp_group_entries
        WHERE (p_filter_building_ids IS NULL OR building_id = ANY(p_filter_building_ids))
    ),
    stats_agg AS (
        SELECT
            AVG(rating) as avg_rating,
            COUNT(*) as rating_count,
            COUNT(DISTINCT building_id) as unique_building_count
        FROM scope_entries
    )
    SELECT
        s.avg_rating, s.rating_count, s.unique_building_count
    INTO
        v_avg_rating, v_rating_count, v_unique_building_count
    FROM stats_agg s;

    v_vibe_metrics := jsonb_build_object(
        'avgRating', COALESCE(v_avg_rating, 0),
        'ratingCount', COALESCE(v_rating_count, 0),
        'uniqueBuildingCount', COALESCE(v_unique_building_count, 0)
    );

    RETURN jsonb_build_object(
        'vibeMetrics', v_vibe_metrics
    );
END;
$$;

-- 4. Re-define update_group_stats with robustness fixes
CREATE OR REPLACE FUNCTION update_group_stats(target_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_member_ids uuid[];
    v_session_building_ids uuid[];
    v_session_building_dates jsonb;
    v_global_stats jsonb;
    v_session_stats jsonb;
    v_empty_metrics jsonb;
BEGIN
    -- 1. Get Group Members
    SELECT array_agg(user_id) INTO v_member_ids
    FROM group_members
    WHERE group_id = target_group_id;

    v_empty_metrics := jsonb_build_object('avgRating', 0, 'ratingCount', 0, 'uniqueBuildingCount', 0);

    IF v_member_ids IS NULL THEN
        UPDATE groups
        SET stats_cache = jsonb_build_object(
            'global', jsonb_build_object('vibeMetrics', v_empty_metrics),
            'session', jsonb_build_object('vibeMetrics', v_empty_metrics),
            'updated_at', now()
        )
        WHERE id = target_group_id;
        RETURN;
    END IF;

    -- 2. Get Session Buildings
    -- Use COALESCE inside aggregation to handle nulls if needed, though join ensures ids
    WITH session_data AS (
        SELECT
            sb.building_id,
            MIN(gs.session_date) as s_date
        FROM group_sessions gs
        JOIN session_buildings sb ON sb.session_id = gs.id
        WHERE gs.group_id = target_group_id
        GROUP BY sb.building_id
    )
    SELECT
        COALESCE(array_agg(building_id), ARRAY[]::uuid[]),
        COALESCE(jsonb_object_agg(building_id::text, s_date), '{}'::jsonb)
    INTO v_session_building_ids, v_session_building_dates
    FROM session_data;

    -- Ensure variables are not null (defensive)
    IF v_session_building_ids IS NULL THEN v_session_building_ids := ARRAY[]::uuid[]; END IF;
    IF v_session_building_dates IS NULL THEN v_session_building_dates := '{}'::jsonb; END IF;

    -- 3. Prepare Logs
    -- DROP TEMP TABLE if it exists to ensure fresh schema
    DROP TABLE IF EXISTS temp_group_entries;

    CREATE TEMPORARY TABLE temp_group_entries (
        id uuid,
        user_id uuid,
        building_id uuid,
        rating int,
        created_at timestamptz,
        visited_at timestamptz,
        content text,
        year_completed int,
        name text,
        main_image_url text,
        architects text[],
        styles text[]
    ) ON COMMIT DROP;

    -- No need to TRUNCATE as we just created/dropped it.

    INSERT INTO temp_group_entries
    SELECT
        ub.id,
        ub.user_id,
        ub.building_id,
        ub.rating,
        ub.created_at,
        ub.visited_at,
        ub.content,
        b.year_completed,
        b.name,
        b.main_image_url,
        b.architects,
        b.styles
    FROM user_buildings ub
    LEFT JOIN buildings b ON b.id = ub.building_id
    WHERE ub.user_id = ANY(v_member_ids)
    AND ub.rating IS NOT NULL;

    -- Calculate Stats
    v_global_stats := (SELECT calculate_scope_stats(target_group_id, v_member_ids, NULL, v_session_building_dates));
    v_session_stats := (SELECT calculate_scope_stats(target_group_id, v_member_ids, v_session_building_ids, v_session_building_dates));

    -- Final Update
    UPDATE groups
    SET stats_cache = jsonb_build_object(
        'global', v_global_stats,
        'session', v_session_stats,
        'updated_at', now(),
        'last_updated', now()
    )
    WHERE id = target_group_id;

    -- Cleanup (optional as ON COMMIT DROP handles it, but good for connection pooling hygiene)
    DROP TABLE IF EXISTS temp_group_entries;
END;
$$;
