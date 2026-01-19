-- Add community stats columns to films
ALTER TABLE films
ADD COLUMN IF NOT EXISTS community_rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS community_vote_average NUMERIC DEFAULT 0;

-- Index for performance (Crucial for the trigger)
CREATE INDEX IF NOT EXISTS idx_log_film_id_rating ON log(film_id, rating);

-- Function to calculate and update film stats
CREATE OR REPLACE FUNCTION update_film_community_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_film_id TEXT;
    stats RECORD;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_film_id := OLD.film_id;
    ELSE
        target_film_id := NEW.film_id;
    END IF;

    -- Calculate new stats
    SELECT
        COUNT(*) as count,
        COALESCE(AVG(rating), 0) as average
    INTO stats
    FROM log
    WHERE film_id = target_film_id
    AND rating IS NOT NULL;

    -- Update films table
    UPDATE films
    SET
        community_rating_count = stats.count,
        community_vote_average = stats.average
    WHERE id = target_film_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep stats updated
DROP TRIGGER IF EXISTS trigger_update_film_community_stats ON log;
CREATE TRIGGER trigger_update_film_community_stats
AFTER INSERT OR UPDATE OR DELETE ON log
FOR EACH ROW
EXECUTE FUNCTION update_film_community_stats();

-- Backfill existing data
DO $$
DECLARE
    f RECORD;
BEGIN
    FOR f IN SELECT id FROM films LOOP
        UPDATE films
        SET
            community_rating_count = (SELECT COUNT(*) FROM log WHERE film_id = f.id AND rating IS NOT NULL),
            community_vote_average = (SELECT COALESCE(AVG(rating), 0) FROM log WHERE film_id = f.id AND rating IS NOT NULL)
        WHERE id = f.id;
    END LOOP;
END $$;

-- Search RPC Function
CREATE OR REPLACE FUNCTION search_films_tiered(
    -- Removed p_user_id for security, using auth.uid()
    p_query TEXT DEFAULT NULL,
    p_genre_ids INTEGER[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_decade_starts INTEGER[] DEFAULT NULL, -- Changed to array
    p_runtime_min INTEGER DEFAULT NULL, -- Kept simple range for now as UI logic usually picks one range or we can OR them.
                                        -- Actually UI allows multi-select.
                                        -- Let's stick to min/max from frontend or handle array.
                                        -- For now, let's keep min/max as the primary filter mechanism or simple overlapping.
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
    vote_count INTEGER
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
            f.id,
            f.tmdb_id,
            f.title,
            f.original_title,
            f.poster_path,
            f.overview,
            f.release_date,
            f.media_type,
            f.genre_ids,
            f.countries,
            f.runtime,
            1 AS tier,
            -- Calculate specific friend stats for this user context
            (
                SELECT AVG(l.rating)
                FROM log l
                WHERE l.film_id = f.id
                AND l.user_id = ANY(v_friend_ids)
                AND l.rating IS NOT NULL
            ) as friend_avg_rating,
            (
                SELECT MAX(l.created_at)
                FROM log l
                WHERE l.film_id = f.id
                AND l.user_id = ANY(v_friend_ids)
            ) as latest_interaction,
            f.community_rating_count as vote_count
        FROM films f
        JOIN log l ON f.id = l.film_id
        WHERE l.user_id = ANY(v_friend_ids)
        -- Apply Filters
        AND (p_query IS NULL OR f.title ILIKE '%' || p_query || '%')
        AND (p_genre_ids IS NULL OR f.genre_ids && p_genre_ids)
        AND (p_countries IS NULL OR (
            EXISTS (
                SELECT 1
                FROM jsonb_array_elements(f.countries) c
                WHERE (c->>'iso_3166_1' = ANY(p_countries)) OR (c#>>'{}' = ANY(p_countries))
            )
        ))
        AND (p_decade_starts IS NULL OR (
            -- Check if release year is within ANY of the selected decades
            EXISTS (
                SELECT 1
                FROM UNNEST(p_decade_starts) d
                WHERE EXTRACT(YEAR FROM CAST(f.release_date AS DATE)) >= d
                AND EXTRACT(YEAR FROM CAST(f.release_date AS DATE)) < d + 10
            )
        ))
        AND (p_runtime_min IS NULL OR f.runtime >= p_runtime_min)
        AND (p_runtime_max IS NULL OR f.runtime <= p_runtime_max)
    ),
    tier2_candidates AS (
        -- Tier 2: Community (Everything else in DB matching filters)
        SELECT
            f.id,
            f.tmdb_id,
            f.title,
            f.original_title,
            f.poster_path,
            f.overview,
            f.release_date,
            f.media_type,
            f.genre_ids,
            f.countries,
            f.runtime,
            2 AS tier,
            NULL::NUMERIC as friend_avg_rating, -- No friend data needed for sorting here
            NULL::TIMESTAMPTZ as latest_interaction,
            f.community_rating_count as vote_count
        FROM films f
        WHERE f.id NOT IN (SELECT id FROM tier1_candidates)
        -- Apply Filters
        AND (p_query IS NULL OR f.title ILIKE '%' || p_query || '%')
        AND (p_genre_ids IS NULL OR f.genre_ids && p_genre_ids)
        AND (p_countries IS NULL OR (
            EXISTS (
                SELECT 1
                FROM jsonb_array_elements(f.countries) c
                WHERE (c->>'iso_3166_1' = ANY(p_countries)) OR (c#>>'{}' = ANY(p_countries))
            )
        ))
        AND (p_decade_starts IS NULL OR (
            EXISTS (
                SELECT 1
                FROM UNNEST(p_decade_starts) d
                WHERE EXTRACT(YEAR FROM CAST(f.release_date AS DATE)) >= d
                AND EXTRACT(YEAR FROM CAST(f.release_date AS DATE)) < d + 10
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
        tier ASC, -- Tier 1 always before Tier 2
        -- Tier 1 Sort: Friend Avg Rating DESC, Recency DESC
        (CASE WHEN tier = 1 THEN friend_avg_rating END) DESC NULLS LAST,
        (CASE WHEN tier = 1 THEN latest_interaction END) DESC NULLS LAST,
        -- Tier 2 Sort: Popularity (Vote Count) DESC, Avg Rating DESC
        (CASE WHEN tier = 2 THEN vote_count END) DESC NULLS LAST,
        (CASE WHEN tier = 2 THEN community_vote_average END) DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
