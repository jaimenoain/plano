-- Fix Compatibility Stats: Robust Correlation and Sample Size
-- 1. Updates `calculate_scope_stats` to handle NULL correlations from "Flatline Raters" (zero variance).
-- 2. Increases compatibility sample size threshold from 3 to 5 to prevent volatility.

CREATE OR REPLACE FUNCTION calculate_scope_stats(
    p_group_id uuid,
    p_member_ids uuid[],
    p_filter_film_ids text[],
    p_session_dates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_result jsonb;
    v_vibe_metrics jsonb;
    v_superlatives jsonb;
    v_compatibility jsonb;
    v_content_dna jsonb;
    v_hidden_gems jsonb;
    v_distributions jsonb;
    v_leaderboards jsonb;

    -- Vibe Vars
    v_avg_rating numeric;
    v_tmdb_avg numeric;
    v_snob_diff numeric;
    v_total_runtime int;
    v_std_dev numeric;
    v_rating_count int;
    v_unique_film_count int;

BEGIN
    -- 1. Vibe Metrics
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs
        WHERE (p_filter_film_ids IS NULL OR film_id::text = ANY(p_filter_film_ids))
    ),
    stats_agg AS (
        SELECT
            AVG(rating) as avg_rating,
            STDDEV(rating) as std_dev,
            SUM(runtime) as total_runtime,
            COUNT(*) as rating_count,
            COUNT(DISTINCT film_id) as unique_film_count
        FROM scope_logs
    ),
    tmdb_agg AS (
        SELECT AVG(vote_average) as tmdb_avg
        FROM scope_logs
        WHERE vote_average > 0
    )
    SELECT
        s.avg_rating, t.tmdb_avg, s.total_runtime, s.std_dev, s.rating_count, s.unique_film_count
    INTO
        v_avg_rating, v_tmdb_avg, v_total_runtime, v_std_dev, v_rating_count, v_unique_film_count
    FROM stats_agg s, tmdb_agg t;

    v_vibe_metrics := jsonb_build_object(
        'avgRating', COALESCE(v_avg_rating, 0),
        'avgTmdb', COALESCE(v_tmdb_avg, 0),
        'snobDiff', COALESCE(v_avg_rating, 0) - COALESCE(v_tmdb_avg, 0),
        'totalRuntime', COALESCE(v_total_runtime, 0),
        'stdDev', COALESCE(v_std_dev, 0),
        'ratingCount', COALESCE(v_rating_count, 0),
        'uniqueFilmCount', COALESCE(v_unique_film_count, 0)
    );

    -- 2. Superlatives (Added HAVING COUNT >= 3 for significance)
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs
        WHERE (p_filter_film_ids IS NULL OR film_id::text = ANY(p_filter_film_ids))
    ),
    member_aggs AS (
        SELECT
            l.user_id,
            p.username,
            p.avatar_url,
            COUNT(*) as count,
            AVG(l.rating) as avg_rating,
            -- Fixed word count logic: Handle empty/null content correctly
            SUM(CASE
                WHEN TRIM(COALESCE(l.content, '')) = '' THEN 0
                ELSE array_length(regexp_split_to_array(TRIM(l.content), '\s+'), 1)
            END) as total_words,
            AVG(LENGTH(COALESCE(l.content, ''))) as avg_length,
            COUNT(l.content) as review_count
        FROM scope_logs l
        JOIN profiles p ON p.id = l.user_id
        GROUP BY l.user_id, p.username, p.avatar_url
    ),
    quickest_draw_calc AS (
        -- Audit Fix: Normalize session date to UTC Midnight to prevent timezone shifts
        SELECT
            l.user_id,
            AVG(EXTRACT(EPOCH FROM (l.created_at - ((p_session_dates->>l.film_id::text)::date + time '00:00:00') AT TIME ZONE 'UTC'))/3600) as avg_delay_hours,
            COUNT(*) as q_count
        FROM scope_logs l
        WHERE (p_session_dates ? l.film_id::text)
          AND l.created_at >= ((p_session_dates->>l.film_id::text)::date + time '00:00:00') AT TIME ZONE 'UTC'
        GROUP BY l.user_id
        -- Quickest Draw: Enforce >= 2 to avoid single lucky click skewing the average
        HAVING COUNT(*) >= 2
    ),
    film_sums AS (
        SELECT film_id, SUM(rating) as total_rating, COUNT(*) as total_count FROM scope_logs GROUP BY film_id
    ),
    contrarian_calc AS (
        -- Audit Fix: "Leave-One-Out" Logic
        SELECT
            l.user_id,
            AVG(ABS(l.rating - CASE
                WHEN fs.total_count > 1 THEN (fs.total_rating - l.rating) / (fs.total_count - 1)::numeric
                ELSE l.rating -- If only 1 rating, deviation is 0
            END)) as avg_deviation,
            COUNT(*) as c_count
        FROM scope_logs l
        JOIN film_sums fs ON fs.film_id = l.film_id
        GROUP BY l.user_id
        HAVING COUNT(*) >= 3
    ),
    time_traveler_calc AS (
        -- Audit Fix: Only use explicit watched_at to prevent backfill false positives
        SELECT
            l.user_id,
            AVG(ABS(EXTRACT(YEAR FROM l.watched_at) - EXTRACT(YEAR FROM l.release_date))) as avg_gap_years,
            COUNT(*) as t_count
        FROM scope_logs l
        WHERE l.release_date IS NOT NULL AND l.watched_at IS NOT NULL
        GROUP BY l.user_id
        HAVING COUNT(*) >= 3
    ),
    director_logs AS (
        SELECT l.user_id, d.name as director_name
        FROM scope_logs l, LATERAL jsonb_to_recordset(l.credits->'crew') AS d(job text, name text)
        WHERE d.job = 'Director'
    ),
    completist_calc AS (
        SELECT user_id, MAX(film_count) as max_count, (ARRAY_AGG(director_name ORDER BY film_count DESC))[1] as top_director
        FROM (SELECT user_id, director_name, COUNT(*) as film_count FROM director_logs GROUP BY user_id, director_name) t
        GROUP BY user_id
    ),
    formatted_superlatives AS (
        SELECT
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', avg_rating, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE count >= 3 ORDER BY avg_rating DESC LIMIT 3) t) as optimist,
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', avg_rating, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE count >= 3 ORDER BY avg_rating ASC LIMIT 3) t) as hater,
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', count, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE count >= 3 ORDER BY count DESC LIMIT 3) t) as prolific,
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', avg_length, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE review_count >= 3 ORDER BY avg_length DESC LIMIT 3) t) as wordsmith,
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', total_words, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE review_count >= 3 ORDER BY total_words DESC LIMIT 3) t) as novelist,
            (SELECT jsonb_agg(jsonb_build_object('name', m.username, 'avatar', m.avatar_url, 'value', q.avg_delay_hours, 'id', m.user_id)) FROM (SELECT * FROM quickest_draw_calc ORDER BY avg_delay_hours ASC LIMIT 3) q JOIN member_aggs m ON m.user_id = q.user_id) as quickestDraw,
            (SELECT jsonb_agg(jsonb_build_object('name', m.username, 'avatar', m.avatar_url, 'value', c.avg_deviation, 'id', m.user_id)) FROM (SELECT * FROM contrarian_calc ORDER BY avg_deviation DESC LIMIT 3) c JOIN member_aggs m ON m.user_id = c.user_id) as contrarian,
            (SELECT jsonb_agg(jsonb_build_object('name', m.username, 'avatar', m.avatar_url, 'value', t.avg_gap_years, 'id', m.user_id)) FROM (SELECT * FROM time_traveler_calc ORDER BY avg_gap_years DESC LIMIT 3) t JOIN member_aggs m ON m.user_id = t.user_id) as timeTraveler,
            (SELECT jsonb_agg(jsonb_build_object('name', m.username, 'avatar', m.avatar_url, 'value', c.max_count, 'id', m.user_id, 'metadata', c.top_director)) FROM (SELECT * FROM completist_calc ORDER BY max_count DESC LIMIT 3) c JOIN member_aggs m ON m.user_id = c.user_id) as completist
    )
    SELECT row_to_json(fs)::jsonb INTO v_superlatives FROM formatted_superlatives fs;

    -- 3. Content DNA & Distributions
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs WHERE (p_filter_film_ids IS NULL OR film_id::text = ANY(p_filter_film_ids))
    ),
    -- RADAR CHART (Fixed Axes with Left Join)
    target_genres AS (
        SELECT * FROM (VALUES
            (27, 'Horror'), (35, 'Comedy'), (18, 'Drama'), (878, 'Sci-Fi'),
            (28, 'Action'), (53, 'Thriller'), (99, 'Documentary'), (10749, 'Romance')
        ) AS t(id, name)
    ),
    expanded_genres AS (
        SELECT l.user_id, l.rating, g.id as genre_id, g.name as genre_name
        FROM scope_logs l JOIN target_genres g ON g.id = ANY(l.genre_ids)
    ),
    group_radar AS (
        SELECT t.name as subject, COALESCE(AVG(e.rating), 0) as value, 10 as "fullMark"
        FROM target_genres t
        LEFT JOIN expanded_genres e ON t.name = e.genre_name
        GROUP BY t.name
    ),
    member_radar AS (
        SELECT user_id, genre_name as subject, AVG(rating) as value
        FROM expanded_genres GROUP BY user_id, genre_name
    ),
    -- ERA DISTRIBUTION
    era_stats AS (
        SELECT CAST(floor(extract(year from release_date::date)/10)*10 AS INT) as decade, COUNT(*) as count, AVG(rating) as avg_rating
        FROM scope_logs WHERE release_date IS NOT NULL GROUP BY 1
    )
    SELECT jsonb_build_object(
        'genreRadar', (SELECT jsonb_agg(row_to_json(g)) FROM group_radar g),
        'memberRadar', (SELECT jsonb_object_agg(user_id, data) FROM (SELECT user_id, jsonb_agg(jsonb_build_object('subject', subject, 'value', value)) as data FROM member_radar GROUP BY user_id) t),
        'eraDistribution', (SELECT jsonb_agg(jsonb_build_object('name', decade || 's', 'value', count, 'avgRating', avg_rating) ORDER BY decade) FROM era_stats)
    ) INTO v_content_dna;

    -- Distributions (Separate Block to fix scope issue)
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs WHERE (p_filter_film_ids IS NULL OR film_id::text = ANY(p_filter_film_ids))
    ),
    rating_buckets AS (
        SELECT ROUND(rating) as score, COUNT(*) as count
        FROM scope_logs GROUP BY 1 ORDER BY 1
    )
    SELECT jsonb_build_object(
        'ratings', (SELECT jsonb_agg(jsonb_build_object('score', score, 'count', count)) FROM rating_buckets)
    ) INTO v_distributions;

    -- 4. Hidden Gems (FIXED LOGIC & NULL SAFETY)
    IF p_filter_film_ids IS NULL THEN
        WITH scope_logs AS (
            SELECT * FROM temp_group_logs WHERE (p_filter_film_ids IS NULL OR film_id::text = ANY(p_filter_film_ids))
        ),
        gems AS (
            SELECT
                l.film_id, MAX(l.title) as title, MAX(l.poster_path) as poster_path, COUNT(*) as count, AVG(l.rating) as avg_rating, array_agg(l.user_id) as fans
            FROM scope_logs l
            WHERE l.rating >= 8.0 AND NOT (l.film_id::text IN (SELECT key FROM jsonb_each_text(COALESCE(p_session_dates, '{}'::jsonb))))
            GROUP BY l.film_id HAVING COUNT(*) >= 2 ORDER BY count DESC, avg_rating DESC LIMIT 3
        )
        SELECT jsonb_agg(jsonb_build_object('title', title, 'count', count, 'poster', poster_path, 'fans', fans)) INTO v_hidden_gems FROM gems;
    END IF;

    -- 5. Leaderboards (Directors & Actors)
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs WHERE (p_filter_film_ids IS NULL OR film_id::text = ANY(p_filter_film_ids))
    ),
    directors AS (
        SELECT d.name, COUNT(*) as count, AVG(l.rating) as avg_rating
        FROM scope_logs l, LATERAL jsonb_to_recordset(l.credits->'crew') AS d(job text, name text)
        WHERE d.job = 'Director' GROUP BY d.name HAVING COUNT(*) >= 3 ORDER BY avg_rating DESC LIMIT 10
    ),
    actors AS (
        SELECT a.name, COUNT(*) as count
        FROM scope_logs l, LATERAL jsonb_to_recordset(l.credits->'cast') AS a(name text)
        GROUP BY a.name ORDER BY count DESC LIMIT 10
    )
    SELECT jsonb_build_object(
        'directors', (SELECT jsonb_agg(row_to_json(d)) FROM directors d),
        'actors', (SELECT jsonb_agg(row_to_json(a)) FROM actors a)
    ) INTO v_leaderboards;

    -- 6. Compatibility
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs WHERE (p_filter_film_ids IS NULL OR film_id::text = ANY(p_filter_film_ids))
    ),
    pair_stats AS (
        -- Audit Fix: COALESCE correlation to 0 to handle "Flatline Raters" (zero variance -> NULL)
        SELECT t1.user_id as u1, t2.user_id as u2, COALESCE(corr(t1.rating, t2.rating), 0) as correlation, count(*) as shared_count
        FROM scope_logs t1 JOIN scope_logs t2 ON t1.film_id = t2.film_id AND t1.user_id < t2.user_id
        -- Audit Fix: Increased threshold to 5 to avoid volatility
        GROUP BY t1.user_id, t2.user_id HAVING count(*) >= 5
    ),
    formatted_pairs AS (
        SELECT u1, u2, correlation, (SELECT row_to_json(p) FROM profiles p WHERE p.id = u1) as m1, (SELECT row_to_json(p) FROM profiles p WHERE p.id = u2) as m2
        FROM pair_stats
    ),
    soulmate AS (SELECT * FROM formatted_pairs ORDER BY correlation DESC LIMIT 1),
    nemesis AS (SELECT * FROM formatted_pairs ORDER BY correlation ASC LIMIT 1),
    lone_wolf AS (
        SELECT user_id, AVG(correlation) as score, (SELECT row_to_json(p) FROM profiles p WHERE p.id = user_id) as m
        FROM (SELECT u1 as user_id, correlation FROM pair_stats UNION ALL SELECT u2 as user_id, correlation FROM pair_stats) t
        GROUP BY user_id ORDER BY score ASC LIMIT 1
    )
    SELECT jsonb_build_object(
        'soulmates', (SELECT jsonb_build_object('m1', jsonb_build_object('user', m1), 'm2', jsonb_build_object('user', m2), 'score', correlation) FROM soulmate),
        'nemesis', (SELECT jsonb_build_object('m1', jsonb_build_object('user', m1), 'm2', jsonb_build_object('user', m2), 'score', correlation) FROM nemesis),
        'loneWolf', (SELECT jsonb_build_object('m', jsonb_build_object('user', m), 'score', score) FROM lone_wolf),
        'allPairs', (SELECT jsonb_agg(jsonb_build_object('u1', u1, 'u2', u2, 'score', correlation)) FROM pair_stats)
    ) INTO v_compatibility;

    RETURN jsonb_build_object(
        'vibeMetrics', v_vibe_metrics,
        'superlatives', v_superlatives,
        'contentDNA', v_content_dna,
        'distributions', v_distributions,
        'leaderboards', v_leaderboards,
        'hiddenGems', v_hidden_gems,
        'compatibility', v_compatibility
    );
END;
$$;
