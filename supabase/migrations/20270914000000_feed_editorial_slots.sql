-- =============================================================================
-- Migration: feed_editorial_slots (Phase 6 — Rotation tiers)
-- Purpose:   Introduces the three editorial feed slot types that guarantee the
--            top of the feed changes between visits even with no new posts.
--
-- Creates:
--   1. feed_editorial_slots — cache table for daily/15-min editorial picks
--   2. get_photo_of_the_day() — highest-engagement image from last 7 days;
--      result cached per UTC calendar day
--   3. get_on_this_day()     — viewer's highest-rated building visit on this
--      calendar date 1y, 5y, or 10y ago; computed per request (per-user)
--   4. get_trending_this_hour() — highest-velocity post in viewer's primary
--      locality (or global); cached with 15-minute TTL
--
-- All RPCs follow SECURITY DEFINER / SET search_path = public convention.
-- GRANT EXECUTE to authenticated only (editorial slots are personalised or
-- viewer-optional; anon users don't need them).
-- =============================================================================

BEGIN;

-- ─── 1. Cache table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feed_editorial_slots (
  slot_kind  TEXT        NOT NULL,
  slot_date  DATE        NOT NULL,
  payload    JSONB       NOT NULL,
  picked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (slot_kind, slot_date)
);

ALTER TABLE public.feed_editorial_slots ENABLE ROW LEVEL SECURITY;

-- Only SECURITY DEFINER RPCs interact with this table; block direct access.
CREATE POLICY "editorial_slots_no_direct_access"
  ON public.feed_editorial_slots
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false);

-- ─── 2. Photo of the Day ──────────────────────────────────────────────────────
-- Picks the most-liked public review image uploaded in the last 7 days.
-- Result is stable for the UTC calendar day; re-computed once per day on first
-- request and cached.

DROP FUNCTION IF EXISTS get_photo_of_the_day();

CREATE OR REPLACE FUNCTION get_photo_of_the_day()
RETURNS TABLE (
  image_storage_path  TEXT,
  review_id           UUID,
  building_id         UUID,
  building_data       JSONB,
  author_data         JSONB,
  score               DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today   DATE    := CURRENT_DATE;
  v_cached  JSONB;
  v_payload JSONB;
BEGIN
  -- Return today's cached pick if it exists.
  SELECT fes.payload INTO v_cached
  FROM feed_editorial_slots fes
  WHERE fes.slot_kind = 'photo_of_the_day' AND fes.slot_date = v_today;

  IF v_cached IS NOT NULL THEN
    RETURN QUERY
    SELECT
      (v_cached->>'image_storage_path')::TEXT,
      (v_cached->>'review_id')::UUID,
      (v_cached->>'building_id')::UUID,
      v_cached->'building_data',
      v_cached->'author_data',
      (v_cached->>'score')::DOUBLE PRECISION;
    RETURN;
  END IF;

  -- Compute: highest-liked public review image from the last 7 days.
  -- Tiebreak: prefer more-recent images.
  RETURN QUERY
  WITH winner AS (
    SELECT
      ri.storage_path,
      ri.review_id,
      bp.building_id,
      bp.user_id,
      ri.likes_count::DOUBLE PRECISION AS score_val,
      ri.created_at
    FROM public.review_images ri
    JOIN public.building_posts bp ON bp.id = ri.review_id
    WHERE
      ri.created_at  >= NOW() - INTERVAL '7 days'
      AND ri.likes_count > 0
      AND COALESCE(bp.visibility, 'public') = 'public'
    ORDER BY ri.likes_count DESC, ri.created_at DESC
    LIMIT 1
  ),
  enriched AS (
    SELECT
      w.storage_path,
      w.review_id,
      w.building_id,
      w.score_val,
      jsonb_build_object(
        'id',                    b.id,
        'name',                  b.name,
        'main_image_url',        public.main_image_url(b),
        'community_preview_url', b.community_preview_url,
        'city',                  b.city,
        'country',               b.country,
        'slug',                  b.slug,
        'short_id',              b.short_id,
        'locality_country_code', loc.country_code,
        'locality_city_slug',    loc.city_slug
      ) AS building_data,
      jsonb_build_object(
        'username',   p.username,
        'avatar_url', p.avatar_url
      ) AS author_data
    FROM winner w
    JOIN public.buildings b    ON b.id = w.building_id
    LEFT JOIN public.localities loc ON loc.id = b.locality_id
    JOIN public.profiles p     ON p.id = w.user_id
  )
  SELECT
    e.storage_path::TEXT,
    e.review_id,
    e.building_id,
    e.building_data,
    e.author_data,
    e.score_val
  FROM enriched e;

  -- Cache the result for the rest of the day.
  -- ON CONFLICT DO NOTHING handles concurrent first-requests gracefully.
  IF FOUND THEN
    SELECT jsonb_build_object(
      'image_storage_path', storage_path,
      'review_id',          review_id,
      'building_id',        building_id,
      'building_data',      building_data,
      'author_data',        author_data,
      'score',              score
    ) INTO v_payload
    FROM (
      SELECT storage_path, review_id, building_id, building_data, author_data, score
    ) sub;

    -- v_payload is built from the last returned row (LIMIT 1 above).
    -- Re-fetch from the RETURN QUERY result set isn't possible here; we
    -- cache by re-querying the winner (idempotent, same result).
    INSERT INTO feed_editorial_slots (slot_kind, slot_date, payload, picked_at)
    SELECT
      'photo_of_the_day',
      v_today,
      jsonb_build_object(
        'image_storage_path', e.storage_path,
        'review_id',          e.review_id,
        'building_id',        e.building_id,
        'building_data',      e.building_data,
        'author_data',        e.author_data,
        'score',              e.score_val
      ),
      NOW()
    FROM (
      SELECT
        ri.storage_path,
        ri.review_id,
        bp.building_id,
        bp.user_id,
        ri.likes_count::DOUBLE PRECISION AS score_val,
        jsonb_build_object(
          'id',                    b.id,
          'name',                  b.name,
          'main_image_url',        public.main_image_url(b),
          'community_preview_url', b.community_preview_url,
          'city',                  b.city,
          'country',               b.country,
          'slug',                  b.slug,
          'short_id',              b.short_id,
          'locality_country_code', loc.country_code,
          'locality_city_slug',    loc.city_slug
        ) AS building_data,
        jsonb_build_object(
          'username',   p.username,
          'avatar_url', p.avatar_url
        ) AS author_data
      FROM public.review_images ri
      JOIN public.building_posts bp ON bp.id = ri.review_id
      JOIN public.buildings b       ON b.id = bp.building_id
      LEFT JOIN public.localities loc ON loc.id = b.locality_id
      JOIN public.profiles p        ON p.id = bp.user_id
      WHERE
        ri.created_at  >= NOW() - INTERVAL '7 days'
        AND ri.likes_count > 0
        AND COALESCE(bp.visibility, 'public') = 'public'
      ORDER BY ri.likes_count DESC, ri.created_at DESC
      LIMIT 1
    ) e
    ON CONFLICT (slot_kind, slot_date) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_photo_of_the_day() TO authenticated;

-- ─── 3. On This Day ───────────────────────────────────────────────────────────
-- Returns the viewer's highest-rated building visit that occurred 1y, 5y, or
-- 10y ago today (same month + day, matching anniversary year). Filters to
-- rated ≥ 4 or visits that have at least one photo (per roadmap risk note).
-- Per-viewer; no caching.

DROP FUNCTION IF EXISTS get_on_this_day();

CREATE OR REPLACE FUNCTION get_on_this_day()
RETURNS TABLE (
  building_id   UUID,
  building_data JSONB,
  years_ago     INT,
  visit_date    DATE,
  visit_rating  INT
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
  SELECT
    ub.building_id,
    jsonb_build_object(
      'id',                    b.id,
      'name',                  b.name,
      'main_image_url',        public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'city',                  b.city,
      'country',               b.country,
      'slug',                  b.slug,
      'short_id',              b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug',    loc.city_slug
    ),
    (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM ub.created_at))::INT,
    ub.created_at::DATE,
    ub.rating
  FROM public.user_buildings ub
  JOIN public.buildings b        ON b.id = ub.building_id
  LEFT JOIN public.localities loc ON loc.id = b.locality_id
  WHERE
    ub.user_id = v_user_id
    AND ub.status IN ('visited', 'pending')
    -- Same calendar day (month + day) in a valid anniversary year
    AND EXTRACT(MONTH FROM ub.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY   FROM ub.created_at) = EXTRACT(DAY   FROM CURRENT_DATE)
    AND EXTRACT(YEAR  FROM ub.created_at) IN (
      EXTRACT(YEAR FROM CURRENT_DATE) - 1,
      EXTRACT(YEAR FROM CURRENT_DATE) - 5,
      EXTRACT(YEAR FROM CURRENT_DATE) - 10
    )
    -- Quality gate: rated ≥ 4 OR has at least one photo (roadmap risk mitigation)
    AND (
      ub.rating >= 4
      OR EXISTS (
        SELECT 1
        FROM public.building_posts bp
        JOIN public.review_images ri ON ri.review_id = bp.id
        WHERE bp.user_id = v_user_id AND bp.building_id = ub.building_id
        LIMIT 1
      )
    )
  ORDER BY ub.rating DESC NULLS LAST,
           ABS(
             EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM ub.created_at) - 5
           ) -- prefer 5y anniversary
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_on_this_day() TO authenticated;

-- ─── 4. Trending This Hour ────────────────────────────────────────────────────
-- Returns the highest-velocity public post from the last 24h with at least
-- one engagement event in the last 120 minutes. Prefers the viewer's primary
-- locality (most-visited city); falls back to global.
-- Cached per (slot_kind='trending_this_hour', slot_date=CURRENT_DATE) with a
-- 15-minute TTL; the payload is refreshed on stale reads.

DROP FUNCTION IF EXISTS get_trending_this_hour();

CREATE OR REPLACE FUNCTION get_trending_this_hour()
RETURNS TABLE (
  review_id           UUID,
  building_id         UUID,
  building_data       JSONB,
  author_data         JSONB,
  image_storage_path  TEXT,
  engagement_velocity DOUBLE PRECISION,
  recent_likes        BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_today    DATE    := CURRENT_DATE;
  v_cached   JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Return cached result if fresh (< 15 minutes old).
  SELECT fes.payload INTO v_cached
  FROM feed_editorial_slots fes
  WHERE fes.slot_kind = 'trending_this_hour'
    AND fes.slot_date = v_today
    AND fes.picked_at >= NOW() - INTERVAL '15 minutes';

  IF v_cached IS NOT NULL THEN
    RETURN QUERY
    SELECT
      (v_cached->>'review_id')::UUID,
      (v_cached->>'building_id')::UUID,
      v_cached->'building_data',
      v_cached->'author_data',
      (v_cached->>'image_storage_path')::TEXT,
      (v_cached->>'engagement_velocity')::DOUBLE PRECISION,
      (v_cached->>'recent_likes')::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_locality AS (
    -- Viewer's most-visited locality (NULL for new users with no visits).
    SELECT b2.locality_id
    FROM public.user_buildings ub2
    JOIN public.buildings b2 ON b2.id = ub2.building_id
    WHERE ub2.user_id = v_user_id AND ub2.status IN ('visited', 'pending')
    GROUP BY b2.locality_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  recent_engagement AS (
    -- Engagement events in the last 120 minutes — indexed on created_at.
    SELECT l.interaction_id AS post_id, COUNT(*) AS like_cnt
    FROM public.likes l
    WHERE l.created_at >= NOW() - INTERVAL '120 minutes'
    GROUP BY l.interaction_id

    UNION ALL

    SELECT c.interaction_id, COUNT(*) * 2 AS like_cnt
    FROM public.comments c
    WHERE c.created_at >= NOW() - INTERVAL '120 minutes'
    GROUP BY c.interaction_id
  ),
  recent_agg AS (
    SELECT post_id, SUM(like_cnt) AS recent_engagement_total
    FROM recent_engagement
    GROUP BY post_id
  ),
  candidates AS (
    SELECT
      bp.id AS review_id,
      bp.building_id,
      bp.user_id,
      bp.created_at,
      ra.recent_engagement_total,
      -- velocity = recent engagement / hours since post (floored at 1h)
      ra.recent_engagement_total::DOUBLE PRECISION
        / GREATEST(1.0, EXTRACT(EPOCH FROM (NOW() - bp.created_at)) / 3600.0)
        AS velocity,
      b.locality_id,
      (SELECT locality_id FROM user_locality) AS viewer_locality_id
    FROM public.building_posts bp
    JOIN public.buildings b    ON b.id = bp.building_id
    JOIN recent_agg ra         ON ra.post_id = bp.id
    WHERE
      bp.created_at >= NOW() - INTERVAL '24 hours'
      AND COALESCE(bp.visibility, 'public') = 'public'
  ),
  winner AS (
    SELECT
      c.review_id,
      c.building_id,
      c.user_id,
      c.velocity,
      c.recent_engagement_total
    FROM candidates c
    ORDER BY
      -- Prefer viewer's primary locality; fall back to global
      CASE WHEN c.locality_id = c.viewer_locality_id AND c.viewer_locality_id IS NOT NULL
           THEN 0 ELSE 1 END,
      c.velocity DESC
    LIMIT 1
  ),
  enriched AS (
    SELECT
      w.review_id,
      w.building_id,
      w.velocity,
      w.recent_engagement_total,
      jsonb_build_object(
        'id',                    b.id,
        'name',                  b.name,
        'main_image_url',        public.main_image_url(b),
        'community_preview_url', b.community_preview_url,
        'city',                  b.city,
        'country',               b.country,
        'slug',                  b.slug,
        'short_id',              b.short_id,
        'locality_country_code', loc.country_code,
        'locality_city_slug',    loc.city_slug
      ) AS building_data,
      jsonb_build_object(
        'username',   p.username,
        'avatar_url', p.avatar_url
      ) AS author_data,
      -- First review image (if any)
      (
        SELECT ri.storage_path::TEXT
        FROM public.review_images ri
        WHERE ri.review_id = w.review_id
        ORDER BY ri.created_at ASC
        LIMIT 1
      ) AS image_storage_path
    FROM winner w
    JOIN public.buildings b        ON b.id = w.building_id
    LEFT JOIN public.localities loc ON loc.id = b.locality_id
    JOIN public.profiles p         ON p.id = w.user_id
  )
  SELECT
    e.review_id,
    e.building_id,
    e.building_data,
    e.author_data,
    e.image_storage_path,
    e.velocity,
    e.recent_engagement_total::BIGINT
  FROM enriched e;

  -- Upsert cache with 15-minute TTL refresh.
  -- DO UPDATE re-stamps picked_at so the next request within 15 min gets the cache.
  IF FOUND THEN
    INSERT INTO feed_editorial_slots (slot_kind, slot_date, payload, picked_at)
    SELECT
      'trending_this_hour',
      v_today,
      jsonb_build_object(
        'review_id',           e.review_id,
        'building_id',         e.building_id,
        'building_data',       e.building_data,
        'author_data',         e.author_data,
        'image_storage_path',  e.image_storage_path,
        'engagement_velocity', e.velocity,
        'recent_likes',        e.recent_engagement_total
      ),
      NOW()
    FROM (
      SELECT
        w.review_id,
        w.building_id,
        w.velocity,
        w.recent_engagement_total,
        jsonb_build_object(
          'id',                    b.id,
          'name',                  b.name,
          'main_image_url',        public.main_image_url(b),
          'community_preview_url', b.community_preview_url,
          'city',                  b.city,
          'country',               b.country,
          'slug',                  b.slug,
          'short_id',              b.short_id,
          'locality_country_code', loc.country_code,
          'locality_city_slug',    loc.city_slug
        ) AS building_data,
        jsonb_build_object('username', p.username, 'avatar_url', p.avatar_url) AS author_data,
        (
          SELECT ri2.storage_path::TEXT
          FROM public.review_images ri2
          WHERE ri2.review_id = w.review_id
          ORDER BY ri2.created_at ASC
          LIMIT 1
        ) AS image_storage_path
      FROM winner w
      JOIN public.buildings b        ON b.id = w.building_id
      LEFT JOIN public.localities loc ON loc.id = b.locality_id
      JOIN public.profiles p         ON p.id = w.user_id
    ) e
    ON CONFLICT (slot_kind, slot_date) DO UPDATE
      SET payload   = EXCLUDED.payload,
          picked_at = EXCLUDED.picked_at;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trending_this_hour() TO authenticated;

COMMIT;
