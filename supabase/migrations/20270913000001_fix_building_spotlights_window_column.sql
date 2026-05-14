-- =============================================================================
-- Migration: fix_building_spotlights_window_column
-- Purpose:   Replaces 20270913000000 which failed because `window` is a
--            reserved word in PostgreSQL (used for window functions).
--            The column is renamed to `time_window` throughout.
--
--            Since the original migration ran inside BEGIN/COMMIT and the
--            error occurred before COMMIT, nothing was persisted. This
--            migration creates everything fresh.
--
-- Refresh schedule recommendation (pg_cron, if enabled):
--   SELECT cron.schedule('refresh-bar-1h', '0 * * * *',
--     $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.building_activity_rolling$$);
-- =============================================================================

BEGIN;

-- ─── 1. Materialized view ─────────────────────────────────────────────────────

DROP MATERIALIZED VIEW IF EXISTS building_activity_rolling;

CREATE MATERIALIZED VIEW building_activity_rolling AS
SELECT
  bp.building_id,
  win.window_name                                       AS time_window,
  COUNT(DISTINCT bp.id)::INT                            AS posts_count,
  COUNT(DISTINCT ri.id)::INT                            AS photos_count,
  COALESCE(SUM(la.cnt), 0)::BIGINT                      AS likes_count,
  MAX(bp.created_at)                                    AS last_activity_at,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT bp.user_id), NULL)    AS contributor_ids
FROM public.building_posts bp
CROSS JOIN (
  VALUES
    ('24h',  INTERVAL '24 hours'),
    ('7d',   INTERVAL '7 days'),
    ('30d',  INTERVAL '30 days')
) AS win(window_name, window_interval)
LEFT JOIN public.review_images ri
  ON ri.review_id = bp.id
LEFT JOIN (
  SELECT l.interaction_id, COUNT(*) AS cnt
  FROM public.likes l
  GROUP BY l.interaction_id
) la ON la.interaction_id = bp.id
WHERE
  bp.created_at >= NOW() - win.window_interval
  AND COALESCE(bp.visibility, 'public') = 'public'
GROUP BY bp.building_id, win.window_name
HAVING COUNT(DISTINCT bp.id) >= 1;

-- Unique index enables CONCURRENTLY refresh without locking reads.
CREATE UNIQUE INDEX building_activity_rolling_pk
  ON building_activity_rolling (building_id, time_window);

-- Seed with initial data so the view is never empty at RPC time.
REFRESH MATERIALIZED VIEW building_activity_rolling;

-- ─── 2. RPC ───────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_building_spotlights(integer, integer);

CREATE OR REPLACE FUNCTION get_building_spotlights(p_limit INT, p_offset INT)
RETURNS TABLE (
  building_id        UUID,
  building_data      JSONB,
  time_window        TEXT,
  posts_count        INT,
  photos_count       INT,
  ring1_contributors JSONB,
  ring               TEXT,
  score              DOUBLE PRECISION,
  last_activity_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH viewer_follows AS (
    SELECT following_id FROM public.follows WHERE follower_id = v_user_id
  ),
  best_window AS (
    -- Pick the smallest time_window that has >= 2 posts per building.
    -- Priority: '24h' > '7d' > '30d'.
    SELECT DISTINCT ON (bar.building_id)
      bar.building_id,
      bar.time_window,
      bar.posts_count,
      bar.photos_count,
      bar.likes_count,
      bar.last_activity_at,
      bar.contributor_ids
    FROM building_activity_rolling bar
    WHERE bar.posts_count >= 2
    ORDER BY
      bar.building_id,
      CASE bar.time_window WHEN '24h' THEN 0 WHEN '7d' THEN 1 ELSE 2 END
  ),
  spotlight_candidates AS (
    SELECT
      bw.building_id,
      bw.time_window,
      bw.posts_count,
      bw.photos_count,
      bw.likes_count,
      bw.last_activity_at,
      ARRAY(
        SELECT unnest(bw.contributor_ids)
        INTERSECT
        SELECT vf.following_id FROM viewer_follows vf
      ) AS ring1_ids
    FROM best_window bw
  ),
  scored AS (
    SELECT
      sc.building_id,
      sc.time_window,
      sc.posts_count,
      sc.photos_count,
      sc.likes_count,
      sc.last_activity_at,
      sc.ring1_ids,
      CASE WHEN CARDINALITY(sc.ring1_ids) > 0 THEN 'direct' ELSE 'open' END AS ring_val,
      (sc.posts_count::DOUBLE PRECISION + sc.photos_count::DOUBLE PRECISION * 0.5)
        * CASE WHEN CARDINALITY(sc.ring1_ids) > 0 THEN 2.0 ELSE 1.0 END
        AS score_val
    FROM spotlight_candidates sc
    ORDER BY score_val DESC, sc.last_activity_at DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT
    s.building_id,
    jsonb_build_object(
      'id',                    b.id,
      'name',                  b.name,
      'main_image_url',        public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'address',               b.address,
      'city',                  b.city,
      'country',               b.country,
      'slug',                  b.slug,
      'short_id',              b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug',    loc.city_slug
    )                                                   AS building_data,
    s.time_window,
    s.posts_count,
    s.photos_count,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'id',         p2.id,
          'username',   p2.username,
          'avatar_url', p2.avatar_url
        ))
        FROM public.profiles p2
        WHERE p2.id = ANY(s.ring1_ids)
      ),
      '[]'::jsonb
    )                                                   AS ring1_contributors,
    s.ring_val                                          AS ring,
    s.score_val                                         AS score,
    s.last_activity_at
  FROM scored s
  LEFT JOIN public.buildings b    ON b.id = s.building_id
  LEFT JOIN public.localities loc ON loc.id = b.locality_id
  ORDER BY s.score_val DESC, s.last_activity_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_building_spotlights(INT, INT) TO authenticated;

COMMIT;
