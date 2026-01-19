-- Updated to match DB fixes
DROP FUNCTION IF EXISTS search_films_tiered(TEXT, INTEGER[], TEXT[], INTEGER[], INTEGER, INTEGER, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION search_films_tiered(
    p_query TEXT DEFAULT NULL,
    p_genre_ids INTEGER[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_decade_starts INTEGER[] DEFAULT NULL,
    p_runtime_min INTEGER DEFAULT NULL,
    p_runtime_max INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    tmdb_id INTEGER,
    title TEXT,
    original_title TEXT,
    poster_path TEXT,
    overview TEXT,
    release_date TEXT,
    media_type TEXT,
    genre_ids INTEGER[],
    countries JSONB,
    runtime INTEGER,
    tier INTEGER,
    friend_avg_rating NUMERIC,
    latest_interaction TIMESTAMPTZ,
    vote_count INTEGER,
    community_vote_average NUMERIC
) AS $$
DECLARE
    v_user_id UUID;
    v_friend_ids UUID[];
BEGIN
    -- Secure User ID
    v_user_id := auth.uid();

    -- Get friend IDs
    SELECT ARRAY_AGG(following_id) INTO v_friend_ids
    FROM follows
    WHERE follower_id = v_user_id;

    RETURN QUERY
    WITH tier1_candidates AS (
        -- Tier 1: Interacted by friends
        SELECT DISTINCT ON (f.id)
            f.id::text,
            f.tmdb_id::integer,
            f.title,
            f.original_title,
            f.poster_path,
            f.overview,
            f.release_date::text,
            f.media_type,
            f.genre_ids,
            f.countries,
            f.runtime,
            1 AS tier,
            (SELECT AVG(l.rating) FROM log l WHERE l.film_id = f.id AND l.user_id = ANY(v_friend_ids) AND l.rating IS NOT NULL) as friend_avg_rating,
            (SELECT MAX(l.created_at) FROM log l WHERE l.film_id = f.id AND l.user_id = ANY(v_friend_ids)) as latest_interaction,
            f.community_rating_count::integer as vote_count,
            f.community_vote_average
        FROM films f
        JOIN log l ON f.id = l.film_id
        WHERE l.user_id = ANY(v_friend_ids)
        AND (p_query IS NULL OR f.title ILIKE '%' || p_query || '%')
        AND (p_genre_ids IS NULL OR f.genre_ids && p_genre_ids)
        AND (p_countries IS NULL OR (
            f.countries IS NOT NULL AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(f.countries) c
                WHERE (c->>'iso_3166_1' = ANY(p_countries)) OR (c#>>'{}' = ANY(p_countries))
            )
        ))
        AND (p_decade_starts IS NULL OR (
            f.release_date IS NOT NULL AND EXISTS (
                SELECT 1
                FROM UNNEST(p_decade_starts) d
                WHERE EXTRACT(YEAR FROM f.release_date) >= d
                AND EXTRACT(YEAR FROM f.release_date) < d + 10
            )
        ))
        AND (p_runtime_min IS NULL OR f.runtime >= p_runtime_min)
        AND (p_runtime_max IS NULL OR f.runtime <= p_runtime_max)
        ORDER BY f.id
    ),
    tier2_candidates AS (
        -- Tier 2: Community
        SELECT
            f.id::text,
            f.tmdb_id::integer,
            f.title,
            f.original_title,
            f.poster_path,
            f.overview,
            f.release_date::text,
            f.media_type,
            f.genre_ids,
            f.countries,
            f.runtime,
            2 AS tier,
            NULL::NUMERIC as friend_avg_rating,
            NULL::TIMESTAMPTZ as latest_interaction,
            f.community_rating_count::integer as vote_count,
            f.community_vote_average
        FROM films f
        WHERE f.id::text NOT IN (SELECT t1.id FROM tier1_candidates t1)
        AND (p_query IS NULL OR f.title ILIKE '%' || p_query || '%')
        AND (p_genre_ids IS NULL OR f.genre_ids && p_genre_ids)
        AND (p_countries IS NULL OR (
            f.countries IS NOT NULL AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(f.countries) c
                WHERE (c->>'iso_3166_1' = ANY(p_countries)) OR (c#>>'{}' = ANY(p_countries))
            )
        ))
        AND (p_decade_starts IS NULL OR (
            f.release_date IS NOT NULL AND EXISTS (
                SELECT 1
                FROM UNNEST(p_decade_starts) d
                WHERE EXTRACT(YEAR FROM f.release_date) >= d
                AND EXTRACT(YEAR FROM f.release_date) < d + 10
            )
        ))
        AND (p_runtime_min IS NULL OR f.runtime >= p_runtime_min)
        AND (p_runtime_max IS NULL OR f.runtime <= p_runtime_max)
    )
    SELECT * FROM (
        SELECT * FROM tier1_candidates
        UNION ALL
        SELECT * FROM tier2_candidates
    ) combined_results
    ORDER BY
        -- CRITICAL FIX: Explicitly reference the table alias "combined_results"
        -- to distinguish these columns from the output variables.
        combined_results.tier ASC,
        (CASE WHEN combined_results.tier = 1 THEN combined_results.friend_avg_rating END) DESC NULLS LAST,
        (CASE WHEN combined_results.tier = 1 THEN combined_results.latest_interaction END) DESC NULLS LAST,
        (CASE WHEN combined_results.tier = 2 THEN combined_results.vote_count END) DESC NULLS LAST,
        (CASE WHEN combined_results.tier = 2 THEN combined_results.community_vote_average END) DESC NULLS LAST,
        combined_results.id ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
