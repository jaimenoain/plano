-- =============================================================================
-- Migration: get_feed_clusters (Phase 7 — Moments clustering)
-- Purpose:   Collapses related ring-1 posts into single feed units so that
--            multiple friends visiting the same city / building in a short
--            window appear as one card instead of N separate posts.
--
-- Three cluster types:
--   multi_user_locality      — ≥2 ring-1 users posted about buildings in the
--                              same locality_id within 7 days.
--   multi_photo_single_building — the same user posted ≥3 photos of the same
--                              building within 7 days (collapses one user's
--                              burst into one card).
--   multi_user_single_building  — ≥2 ring-1 users posted about the same
--                              building within 30 days.
--
-- Scoring: 1.3 × lead post score (lead = highest individual post score in the
-- cluster). The cluster bonus rewards grouping without drowning standalone posts
-- from other authors.
--
-- Return shape (matches FeedItemMomentCluster TS type):
--   cluster_id           text           — stable synthetic id
--   cluster_kind         text           — one of the three kinds above
--   lead_post            jsonb          — highest-scored post
--   supporting_posts     jsonb[]        — next up to 4 posts in the cluster
--   actors               jsonb[]        — distinct user info for all actors
--   building_or_locality jsonb          — building or locality context card
--   score                double precision
--
-- Conventions (match all other feed RPCs):
--   SECURITY DEFINER, SET search_path = public, extensions
--   GRANT EXECUTE to anon, authenticated
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS get_feed_clusters(integer, integer);

CREATE OR REPLACE FUNCTION get_feed_clusters(p_limit INT, p_offset INT)
RETURNS TABLE (
  cluster_id           TEXT,
  cluster_kind         TEXT,
  lead_post            JSONB,
  supporting_posts     JSONB[],
  actors               JSONB[],
  building_or_locality JSONB,
  score                DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH ring1_user_ids AS (
    -- Viewer + direct follows
    SELECT v_user_id AS uid
    UNION ALL
    SELECT following_id FROM public.follows WHERE follower_id = v_user_id
  ),
  raw_posts AS (
    -- All eligible ring-1 posts from the last 30 days (longest cluster window).
    -- Capped at 500 most-recent to keep the join tractable.
    SELECT
      bp.id,
      bp.user_id,
      bp.building_id,
      bp.body          AS content,
      bp.created_at,
      bp.video_url,
      b.locality_id,
      b.name           AS b_name,
      b.city           AS b_city,
      b.slug           AS b_slug,
      b.short_id       AS b_short_id,
      public.main_image_url(b)    AS b_main_image_url,
      b.community_preview_url     AS b_community_preview_url,
      p.username,
      p.avatar_url
    FROM public.building_posts bp
    JOIN public.buildings b  ON b.id = bp.building_id
    JOIN public.profiles  p  ON p.id = bp.user_id
    WHERE
      bp.created_at >= NOW() - INTERVAL '30 days'
      AND COALESCE(bp.visibility, 'public') = 'public'
      AND bp.user_id IN (SELECT uid FROM ring1_user_ids)
    ORDER BY bp.created_at DESC
    LIMIT 500
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT id FROM raw_posts)
    GROUP BY l.interaction_id
  ),
  comments_agg AS (
    SELECT c.interaction_id, COUNT(*) AS cnt
    FROM public.comments c
    WHERE c.interaction_id IN (SELECT id FROM raw_posts)
    GROUP BY c.interaction_id
  ),
  images_count_agg AS (
    SELECT ri.review_id, COUNT(*) AS img_cnt
    FROM public.review_images ri
    WHERE ri.review_id IN (SELECT id FROM raw_posts)
    GROUP BY ri.review_id
  ),
  first_image_agg AS (
    -- First image path per post for thumbnail display
    SELECT DISTINCT ON (ri.review_id)
      ri.review_id,
      ri.storage_path
    FROM public.review_images ri
    WHERE ri.review_id IN (SELECT id FROM raw_posts)
    ORDER BY ri.review_id, ri.created_at ASC
  ),
  scored_posts AS (
    SELECT
      rp.*,
      COALESCE(la.cnt,  0)   AS likes_cnt,
      COALESCE(ca.cnt,  0)   AS comments_cnt,
      COALESCE(ica.img_cnt, 0) AS image_cnt,
      EXTRACT(EPOCH FROM (NOW() - rp.created_at)) / 3600.0 AS freshness_hours,
      -- Same scoring formula as get_feed_ranked
      EXP(-LN(2) * (EXTRACT(EPOCH FROM (NOW() - rp.created_at)) / 3600.0) / 36.0)
        * (1.0 + 0.5 * LEAST(
            (COALESCE(la.cnt, 0) + 2.0 * COALESCE(ca.cnt, 0))
              / GREATEST(1.0, EXTRACT(EPOCH FROM (NOW() - rp.created_at)) / 3600.0),
            10.0
          ))
        * CASE
            WHEN rp.video_url IS NOT NULL      THEN 1.6
            WHEN COALESCE(ica.img_cnt, 0) >= 3 THEN 1.4
            WHEN COALESCE(ica.img_cnt, 0) = 2  THEN 1.2
            WHEN COALESCE(ica.img_cnt, 0) = 1  THEN 1.0
            ELSE 0.7
          END
        AS post_score,
      fi.storage_path AS first_image_path
    FROM raw_posts rp
    LEFT JOIN likes_agg          la  ON la.interaction_id = rp.id
    LEFT JOIN comments_agg       ca  ON ca.interaction_id = rp.id
    LEFT JOIN images_count_agg   ica ON ica.review_id     = rp.id
    LEFT JOIN first_image_agg    fi  ON fi.review_id      = rp.id
  ),

  -- ─── Cluster type 1: Multi-user locality (7 days, ≥2 distinct users) ───────
  locality_groups AS (
    SELECT
      locality_id,
      ARRAY_AGG(id        ORDER BY post_score DESC) AS post_ids,
      ARRAY_AGG(user_id   ORDER BY post_score DESC) AS actor_ids_ordered,
      MAX(post_score)   AS lead_score,
      -- representative building info from the lead post
      (ARRAY_AGG(b_name   ORDER BY post_score DESC))[1] AS loc_b_name,
      (ARRAY_AGG(b_city   ORDER BY post_score DESC))[1] AS loc_b_city,
      (ARRAY_AGG(b_main_image_url ORDER BY post_score DESC))[1] AS loc_b_img
    FROM scored_posts
    WHERE
      locality_id IS NOT NULL
      AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY locality_id
    HAVING COUNT(DISTINCT user_id) >= 2
  ),

  -- ─── Cluster type 2: Multi-photo single-building (7 days, same user, ≥3) ───
  photo_groups AS (
    SELECT
      user_id,
      building_id,
      ARRAY_AGG(id ORDER BY post_score DESC)  AS post_ids,
      MAX(post_score) AS lead_score,
      (ARRAY_AGG(b_name   ORDER BY post_score DESC))[1] AS pg_b_name,
      (ARRAY_AGG(b_city   ORDER BY post_score DESC))[1] AS pg_b_city,
      (ARRAY_AGG(b_main_image_url ORDER BY post_score DESC))[1] AS pg_b_img,
      (ARRAY_AGG(b_community_preview_url ORDER BY post_score DESC))[1] AS pg_b_preview,
      (ARRAY_AGG(b_slug   ORDER BY post_score DESC))[1] AS pg_b_slug,
      (ARRAY_AGG(b_short_id ORDER BY post_score DESC))[1] AS pg_b_short_id
    FROM scored_posts
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY user_id, building_id
    HAVING COUNT(*) >= 3
  ),

  -- ─── Cluster type 3: Multi-user single-building (30 days, ≥2 users) ────────
  building_groups AS (
    SELECT
      building_id,
      ARRAY_AGG(id        ORDER BY post_score DESC) AS post_ids,
      ARRAY_AGG(user_id   ORDER BY post_score DESC) AS actor_ids_ordered,
      MAX(post_score)   AS lead_score,
      (ARRAY_AGG(b_name   ORDER BY post_score DESC))[1] AS bg_b_name,
      (ARRAY_AGG(b_city   ORDER BY post_score DESC))[1] AS bg_b_city,
      (ARRAY_AGG(b_main_image_url ORDER BY post_score DESC))[1] AS bg_b_img,
      (ARRAY_AGG(b_community_preview_url ORDER BY post_score DESC))[1] AS bg_b_preview,
      (ARRAY_AGG(b_slug   ORDER BY post_score DESC))[1] AS bg_b_slug,
      (ARRAY_AGG(b_short_id ORDER BY post_score DESC))[1] AS bg_b_short_id
    FROM scored_posts
    GROUP BY building_id
    HAVING COUNT(DISTINCT user_id) >= 2
  ),

  -- ─── Locality cluster rows ────────────────────────────────────────────────
  locality_rows AS (
    SELECT
      'locality:' || lg.locality_id::TEXT                          AS cluster_id,
      'multi_user_locality'                                        AS cluster_kind,
      -- Lead post (highest score)
      (SELECT jsonb_build_object(
        'id',                  sp.id,
        'content',             sp.content,
        'created_at',          sp.created_at,
        'building_id',         sp.building_id,
        'building_name',       sp.b_name,
        'building_city',       sp.b_city,
        'image_storage_path',  sp.first_image_path
      ) FROM scored_posts sp WHERE sp.id = lg.post_ids[1])        AS lead_post,
      -- Supporting posts (up to 4)
      (SELECT ARRAY_AGG(
        jsonb_build_object(
          'id',                 sp.id,
          'building_id',        sp.building_id,
          'building_name',      sp.b_name,
          'image_storage_path', sp.first_image_path
        ) ORDER BY array_position(lg.post_ids, sp.id)
      ) FROM scored_posts sp
        WHERE sp.id = ANY(lg.post_ids[2:5]))                      AS supporting_posts,
      -- Distinct actors in score order
      (SELECT ARRAY_AGG(
        jsonb_build_object(
          'id',         sp2.user_id,
          'username',   sp2.username,
          'avatar_url', sp2.avatar_url
        ) ORDER BY sp2.rn
      ) FROM (
        SELECT DISTINCT ON (user_id)
          user_id, username, avatar_url,
          array_position(lg.actor_ids_ordered, user_id) AS rn
        FROM scored_posts
        WHERE id = ANY(lg.post_ids)
        ORDER BY user_id, array_position(lg.actor_ids_ordered, user_id)
      ) sp2)                                                       AS actors,
      -- Locality context (city from representative building)
      jsonb_build_object(
        'kind',         'locality',
        'locality_id',  lg.locality_id,
        'city',         lg.loc_b_city,
        'building_name', lg.loc_b_name,
        'main_image_url', lg.loc_b_img
      )                                                            AS building_or_locality,
      lg.lead_score * 1.3                                         AS score
    FROM locality_groups lg
  ),

  -- ─── Photo cluster rows ───────────────────────────────────────────────────
  photo_rows AS (
    SELECT
      'photo_cluster:' || pg.user_id::TEXT || ':' || pg.building_id::TEXT AS cluster_id,
      'multi_photo_single_building'                                        AS cluster_kind,
      (SELECT jsonb_build_object(
        'id',                 sp.id,
        'content',            sp.content,
        'created_at',         sp.created_at,
        'building_id',        sp.building_id,
        'building_name',      sp.b_name,
        'building_city',      sp.b_city,
        'image_storage_path', sp.first_image_path
      ) FROM scored_posts sp WHERE sp.id = pg.post_ids[1])                AS lead_post,
      (SELECT ARRAY_AGG(
        jsonb_build_object(
          'id',                 sp.id,
          'building_id',        sp.building_id,
          'building_name',      sp.b_name,
          'image_storage_path', sp.first_image_path
        ) ORDER BY array_position(pg.post_ids, sp.id)
      ) FROM scored_posts sp
        WHERE sp.id = ANY(pg.post_ids[2:6]))                              AS supporting_posts,
      (SELECT ARRAY_AGG(jsonb_build_object(
        'id',         sp.user_id,
        'username',   sp.username,
        'avatar_url', sp.avatar_url
      )) FROM (SELECT DISTINCT user_id, username, avatar_url
               FROM scored_posts WHERE id = pg.post_ids[1]) sp)           AS actors,
      jsonb_build_object(
        'kind',                 'building',
        'building_id',          pg.building_id,
        'building_name',        pg.pg_b_name,
        'city',                 pg.pg_b_city,
        'main_image_url',       pg.pg_b_img,
        'community_preview_url',pg.pg_b_preview,
        'slug',                 pg.pg_b_slug,
        'short_id',             pg.pg_b_short_id
      )                                                                   AS building_or_locality,
      pg.lead_score * 1.3                                                 AS score
    FROM photo_groups pg
  ),

  -- ─── Building cluster rows ────────────────────────────────────────────────
  building_rows AS (
    SELECT
      'building_cluster:' || bg.building_id::TEXT                 AS cluster_id,
      'multi_user_single_building'                                 AS cluster_kind,
      (SELECT jsonb_build_object(
        'id',                 sp.id,
        'content',            sp.content,
        'created_at',         sp.created_at,
        'building_id',        sp.building_id,
        'building_name',      sp.b_name,
        'building_city',      sp.b_city,
        'image_storage_path', sp.first_image_path
      ) FROM scored_posts sp WHERE sp.id = bg.post_ids[1])        AS lead_post,
      (SELECT ARRAY_AGG(
        jsonb_build_object(
          'id',                 sp.id,
          'building_id',        sp.building_id,
          'building_name',      sp.b_name,
          'image_storage_path', sp.first_image_path
        ) ORDER BY array_position(bg.post_ids, sp.id)
      ) FROM scored_posts sp
        WHERE sp.id = ANY(bg.post_ids[2:5]))                      AS supporting_posts,
      (SELECT ARRAY_AGG(
        jsonb_build_object(
          'id',         sp2.user_id,
          'username',   sp2.username,
          'avatar_url', sp2.avatar_url
        ) ORDER BY sp2.rn
      ) FROM (
        SELECT DISTINCT ON (user_id)
          user_id, username, avatar_url,
          array_position(bg.actor_ids_ordered, user_id) AS rn
        FROM scored_posts
        WHERE id = ANY(bg.post_ids)
        ORDER BY user_id, array_position(bg.actor_ids_ordered, user_id)
      ) sp2)                                                       AS actors,
      jsonb_build_object(
        'kind',                 'building',
        'building_id',          bg.building_id,
        'building_name',        bg.bg_b_name,
        'city',                 bg.bg_b_city,
        'main_image_url',       bg.bg_b_img,
        'community_preview_url',bg.bg_b_preview,
        'slug',                 bg.bg_b_slug,
        'short_id',             bg.bg_b_short_id
      )                                                            AS building_or_locality,
      bg.lead_score * 1.3                                         AS score
    FROM building_groups bg
  ),

  all_clusters AS (
    SELECT * FROM locality_rows
    UNION ALL
    SELECT * FROM photo_rows
    UNION ALL
    SELECT * FROM building_rows
  )

  SELECT *
  FROM all_clusters
  ORDER BY score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_feed_clusters(integer, integer) TO anon, authenticated;

COMMIT;
