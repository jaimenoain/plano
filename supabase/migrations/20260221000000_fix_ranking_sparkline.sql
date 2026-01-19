-- Fix for Ranking Context Sparkline Data Source
-- Filters ranking_data to only include films that have been part of ANY session in the group's history.
-- Excludes films that group members have rated but were never watched in a group session.

CREATE OR REPLACE FUNCTION update_group_stats(target_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Variables for results
    v_member_ids uuid[];
    v_session_film_ids text[];
    v_session_film_dates jsonb;
    v_session_count int;

    -- Stats Containers
    v_global_stats jsonb;
    v_session_stats jsonb;
    v_ranking_data jsonb;
    v_this_month_stats jsonb;

    -- Temp vars for calculations
    v_start_of_month timestamptz;
    v_empty_metrics jsonb;

BEGIN
    -- 1. Get Group Members
    SELECT array_agg(user_id) INTO v_member_ids
    FROM group_members
    WHERE group_id = target_group_id;

    -- Defined empty metrics structure to prevent UI stuck state
    v_empty_metrics := jsonb_build_object('avgRating', 0, 'avgTmdb', 0, 'snobDiff', 0, 'totalRuntime', 0, 'stdDev', 0, 'ratingCount', 0, 'uniqueFilmCount', 0);

    IF v_member_ids IS NULL THEN
        UPDATE groups
        SET stats_cache = jsonb_build_object(
            'ranking_data', '[]'::jsonb,
            'global', jsonb_build_object('vibeMetrics', v_empty_metrics),
            'session', jsonb_build_object('vibeMetrics', v_empty_metrics),
            'thisMonth', null,
            'sessionCount', 0,
            'updated_at', now(),
            'last_updated', now()
        )
        WHERE id = target_group_id;
        RETURN;
    END IF;

    -- 2. Get Session Films and Dates
    WITH session_data AS (
        SELECT
            sf.film_id,
            MIN(gs.session_date) as s_date
        FROM group_sessions gs
        JOIN session_films sf ON sf.session_id = gs.id
        WHERE gs.group_id = target_group_id
        GROUP BY sf.film_id
    )
    SELECT
        COALESCE(array_agg(film_id::text), ARRAY[]::text[]),
        jsonb_object_agg(film_id::text, s_date)
    INTO v_session_film_ids, v_session_film_dates
    FROM session_data;

    IF v_session_film_ids IS NULL THEN v_session_film_ids := ARRAY[]::text[]; END IF;
    IF v_session_film_dates IS NULL THEN v_session_film_dates := '{}'::jsonb; END IF;

    -- 3. Get Session Count
    SELECT COUNT(*) INTO v_session_count
    FROM group_sessions
    WHERE group_id = target_group_id;

    -- 4. Prepare Logs
    -- Ensure table exists in current session if it wasn't created by the global block above
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_group_logs (
        id uuid,
        user_id uuid,
        film_id text,
        rating float,
        created_at timestamptz,
        watched_at timestamptz,
        content text,
        runtime int,
        vote_average float,
        release_date date,
        genre_ids int[],
        title text,
        poster_path text,
        credits jsonb
    ) ON COMMIT DROP;

    -- Clear previous data
    TRUNCATE temp_group_logs;

    -- Populate with DEDUPLICATION (1 log per user per film, preferring latest)
    INSERT INTO temp_group_logs
    SELECT DISTINCT ON (l.user_id, l.film_id)
        l.id,
        l.user_id,
        l.film_id,
        l.rating,
        l.created_at,
        l.watched_at,
        l.content,
        f.runtime,
        f.vote_average,
        f.release_date,
        f.genre_ids,
        f.title,
        f.poster_path,
        f.credits
    FROM log l
    LEFT JOIN films f ON f.id = l.film_id
    WHERE l.user_id = ANY(v_member_ids)
    AND l.rating IS NOT NULL
    ORDER BY l.user_id, l.film_id, l.created_at DESC;

    -- 5. Calculate Global Ranking Data (Sparkline)
    -- WARNING: CRITICAL LOGIC - SEE AGENTS.MD
    -- This query must strictly filter for films that are part of the group's session history (`v_session_film_ids`).
    -- DO NOT remove the `WHERE film_id = ANY(v_session_film_ids)` clause.
    -- DO NOT change this to include all films rated by members.
    SELECT jsonb_agg(t) INTO v_ranking_data
    FROM (
        SELECT
            film_id,
            MAX(title) as title,
            AVG(rating) as avg_rating,
            COUNT(id) as review_count
        FROM temp_group_logs
        WHERE film_id = ANY(v_session_film_ids) -- CRITICAL FILTER: SESSION FILMS ONLY
        GROUP BY film_id
        ORDER BY avg_rating DESC
    ) t;

    -- Calculate Stats
    v_global_stats := (SELECT calculate_scope_stats(target_group_id, v_member_ids, NULL, v_session_film_dates));
    v_session_stats := (SELECT calculate_scope_stats(target_group_id, v_member_ids, v_session_film_ids, v_session_film_dates));

    -- Calculate This Month Stats
    v_start_of_month := date_trunc('month', now());

    WITH monthly_logs AS (
        SELECT * FROM temp_group_logs
        WHERE created_at >= v_start_of_month
    ),
    contributor AS (
        SELECT user_id, COUNT(*) as count
        FROM monthly_logs
        GROUP BY user_id
        ORDER BY count DESC LIMIT 1
    ),
    reviewer AS (
         SELECT user_id, SUM(array_length(regexp_split_to_array(TRIM(COALESCE(content, '')), '\s+'), 1)) as total_words
        FROM monthly_logs
        WHERE content IS NOT NULL
        GROUP BY user_id
        ORDER BY total_words DESC LIMIT 1
    ),
    trending AS (
        SELECT film_id, MAX(title) as title, MAX(poster_path) as poster_path, COUNT(*) as count
        FROM monthly_logs
        GROUP BY film_id
        ORDER BY count DESC, MAX(created_at) DESC LIMIT 1
    )
    SELECT jsonb_build_object(
        'contributor', (SELECT jsonb_build_object('member', (SELECT row_to_json(p) FROM profiles p WHERE p.id = c.user_id), 'value', c.count) FROM contributor c),
        'reviewer', (SELECT jsonb_build_object('member', (SELECT row_to_json(p) FROM profiles p WHERE p.id = r.user_id), 'value', r.total_words) FROM reviewer r),
        'trending', (SELECT jsonb_build_object('title', t.title, 'poster_path', t.poster_path, 'count', t.count) FROM trending t)
    ) INTO v_this_month_stats;

    -- Final Update
    UPDATE groups
    SET stats_cache = jsonb_build_object(
        'ranking_data', COALESCE(v_ranking_data, '[]'::jsonb),
        'global', v_global_stats,
        'session', v_session_stats,
        'thisMonth', v_this_month_stats,
        'sessionCount', COALESCE(v_session_count, 0),
        'updated_at', now(),
        'last_updated', now()
    )
    WHERE id = target_group_id;

    -- Cleanup
    TRUNCATE temp_group_logs;
END;
$$;

-- Explicitly Grant Permissions
GRANT EXECUTE ON FUNCTION update_group_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_group_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION update_group_stats(uuid) TO anon;
