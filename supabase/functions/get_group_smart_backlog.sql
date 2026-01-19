-- Function to get the Smart Backlog for a group
-- Arguments:
--   p_group_id: UUID of the group (context)
--   p_member_ids: Array of UUIDs of selected members
--   p_exclude_seen: Boolean, if true, hides films seen by ANY selected member
--   p_max_runtime: Integer (minutes), filter films shorter than this
--   p_providers: Text array, filter films available on ANY of these providers (names)

CREATE OR REPLACE FUNCTION get_group_smart_backlog(
  p_group_id UUID,
  p_member_ids UUID[],
  p_exclude_seen BOOLEAN DEFAULT FALSE,
  p_max_runtime INT DEFAULT NULL,
  p_providers TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  poster_path TEXT,
  release_date TEXT,
  runtime INT,
  overview TEXT,
  vote_average NUMERIC,
  overlap_count BIGINT,
  interested_users JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 1. Identify films seen by ANY of the selected members (if exclusion is requested)
  seen_films AS (
    SELECT DISTINCT l.film_id
    FROM log l
    WHERE l.user_id = ANY(p_member_ids)
      AND (
        l.status = 'watched'
        OR l.rating IS NOT NULL
        OR l.watched_at IS NOT NULL
      )
  ),
  -- 2. Aggregate watchlist items for selected members
  watchlist_aggregation AS (
    SELECT
      l.film_id,
      COUNT(DISTINCT l.user_id) as overlap,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'avatar_url', p.avatar_url
        )
      ) as users
    FROM log l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.user_id = ANY(p_member_ids)
      AND l.status = 'watchlist'
    GROUP BY l.film_id
  )
  -- 3. Select final results joining with films table
  SELECT
    f.id,
    f.title,
    f.poster_path,
    f.release_date,
    f.runtime,
    f.overview,
    f.vote_average,
    wa.overlap,
    wa.users
  FROM films f
  JOIN watchlist_aggregation wa ON f.id = wa.film_id
  WHERE
    -- Exclude seen films if requested
    (p_exclude_seen IS FALSE OR f.id NOT IN (SELECT film_id FROM seen_films))
    -- Runtime filter
    AND (p_max_runtime IS NULL OR f.runtime <= p_max_runtime)
    -- Provider filter (simplified check against JSONB)
    -- Checks if any provider in p_providers exists in the watch_providers JSON
    -- This assumes watch_providers structure contains provider names or we match loosely
    AND (
      p_providers IS NULL
      OR
      EXISTS (
        SELECT 1
        FROM jsonb_each(f.watch_providers) country_providers
        WHERE EXISTS (
            SELECT 1
            FROM jsonb_array_elements(country_providers.value -> 'flatrate') provider
            WHERE (provider ->> 'provider_name') = ANY(p_providers)
        )
      )
    )
  ORDER BY wa.overlap DESC, f.vote_average DESC;
END;
$$ LANGUAGE plpgsql;
