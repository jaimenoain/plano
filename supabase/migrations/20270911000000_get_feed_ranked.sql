-- =============================================================================
-- Migration: get_feed_ranked
-- Purpose:   Introduces the Phase 1 ranker RPC. Same source set as get_feed
--            (posts by followed users + own posts, same visibility rules) but
--            returns rows ordered by a composite score instead of created_at.
--
-- Scoring formula (all weights applied in SQL; diversity + seen penalties live
-- in application code per Operating Principle #6):
--
--   freshness_decay     = exp(-ln(2) * hours_since_post / 36)   -- 36h half-life
--   engagement_velocity = (likes + 2 * comments) / GREATEST(1, hours)
--   media_quality       = 1.6 (video) | 1.4 (3+ images) | 1.2 (2 img) |
--                         1.0 (1 img) | 0.7 (text-only)
--   score               = freshness_decay
--                       * (1.0 + 0.5 * LEAST(engagement_velocity, 10))
--                       * media_quality
--
-- Pagination: offset-based (p_limit / p_offset). Keyset pagination on a
-- non-monotonic score would require snapshotting scores per query or accepting
-- drift; offset is meaningfully simpler and acceptable for Phase 1's scale.
-- Candidates are capped at 500 most-recent to keep the scoring pass tractable
-- even for users with large follow graphs.
--
-- Extra return columns (beyond get_feed shape):
--   score           double precision — composite rank score
--   ring            text             — always 'direct' in Phase 1
--   freshness_hours double precision — age of the post in hours at query time
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS get_feed_ranked(integer, integer);

CREATE OR REPLACE FUNCTION get_feed_ranked(p_limit INT, p_offset INT)
RETURNS TABLE (
  id              UUID,
  content         TEXT,
  rating          INTEGER,
  tags            TEXT[],
  created_at      TIMESTAMPTZ,
  edited_at       TIMESTAMPTZ,
  status          TEXT,
  user_id         UUID,
  building_id     UUID,
  user_data       JSONB,
  building_data   JSONB,
  likes_count     BIGINT,
  comments_count  BIGINT,
  views_count     BIGINT,
  is_liked        BOOLEAN,
  review_images   JSONB,
  score           DOUBLE PRECISION,
  ring            TEXT,
  freshness_hours DOUBLE PRECISION
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
  WITH candidates AS (
    -- Cap to 500 most-recent eligible posts so the scoring pass is O(500)
    -- even for users with large follow graphs. Indexes on (created_at DESC)
    -- keep this inner query fast.
    SELECT
      bp.id,
      bp.body        AS content,
      ub.rating,
      bp.tags,
      bp.created_at,
      bp.updated_at  AS edited_at,
      ub.status,
      bp.user_id,
      bp.building_id,
      bp.views_count,
      bp.video_url
    FROM public.building_posts bp
    LEFT JOIN public.user_buildings ub
      ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
    WHERE
      -- Same relationship / visibility rules as get_feed
      (bp.user_id = v_user_id
       OR bp.user_id IN (
         SELECT following_id FROM public.follows WHERE follower_id = v_user_id
       ))
      AND (
        bp.user_id = v_user_id
        OR COALESCE(bp.visibility, 'public') = 'public'
        OR (
          bp.visibility = 'contacts'
          AND EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.follower_id = v_user_id AND f.following_id = bp.user_id
          )
        )
      )
      AND (ub.status IS NULL OR ub.status != 'ignored')
      AND (
        bp.body         IS NOT NULL
        OR bp.tags      IS NOT NULL
        OR bp.video_url IS NOT NULL
        OR (ub.status IN ('visited', 'pending'))
        OR EXISTS (SELECT 1 FROM public.review_images ri WHERE ri.review_id = bp.id)
      )
    ORDER BY bp.created_at DESC
    LIMIT 500
  ),
  -- Aggregate engagement signals for all candidates in one pass
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT c.id FROM candidates c)
    GROUP BY l.interaction_id
  ),
  comments_agg AS (
    SELECT c2.interaction_id, COUNT(*) AS cnt
    FROM public.comments c2
    WHERE c2.interaction_id IN (SELECT c.id FROM candidates c)
    GROUP BY c2.interaction_id
  ),
  images_count_agg AS (
    SELECT ri.review_id, COUNT(*) AS img_cnt
    FROM public.review_images ri
    WHERE ri.review_id IN (SELECT c.id FROM candidates c)
    GROUP BY ri.review_id
  ),
  user_likes AS (
    SELECT l.interaction_id
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT c.id FROM candidates c)
      AND l.user_id = v_user_id
  ),
  images_agg AS (
    SELECT
      ri.review_id,
      jsonb_agg(
        jsonb_build_object(
          'id',           ri.id,
          'storage_path', ri.storage_path,
          'likes_count',  ri.likes_count,
          'is_liked',     (il.image_id IS NOT NULL)
        )
      ) AS imgs
    FROM public.review_images ri
    LEFT JOIN public.image_likes il ON il.image_id = ri.id AND il.user_id = v_user_id
    WHERE ri.review_id IN (SELECT c.id FROM candidates c)
    GROUP BY ri.review_id
  ),
  credits_agg AS (
    SELECT
      bc.building_id,
      jsonb_agg(
        jsonb_build_object(
          'name', COALESCE(pp.name, cc.name),
          'id',   COALESCE(bc.person_id, bc.company_id)
        )
        ORDER BY COALESCE(pp.name, cc.name)
      ) FILTER (WHERE COALESCE(pp.name, cc.name) IS NOT NULL) AS credited_entities
    FROM public.building_credits bc
    LEFT JOIN public.people pp    ON bc.person_id  = pp.id
    LEFT JOIN public.companies cc ON bc.company_id = cc.id
    WHERE bc.building_id IN (SELECT DISTINCT c.building_id FROM candidates c)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  verified_architects AS (
    SELECT DISTINCT user_id FROM (
      SELECT pe.claimed_by_user_id AS user_id
        FROM public.people pe
       WHERE pe.claim_status::text IN ('claimed', 'verified')
      UNION
      SELECT cs.user_id
        FROM public.company_stewards cs
        JOIN public.companies c ON cs.company_id = c.id
       WHERE cs.role = 'owner' AND c.claim_status::text IN ('claimed', 'verified')
    ) sub
    WHERE user_id IN (SELECT DISTINCT c.user_id FROM candidates c)
  ),
  architect_of_building AS (
    SELECT DISTINCT c.user_id, c.building_id
    FROM candidates c
    JOIN public.building_credits bc
      ON bc.building_id = c.building_id
     AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    WHERE EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = c.user_id
      ) OR EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = bc.company_id AND cs.user_id = c.user_id
      )
  ),
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT c.user_id FROM candidates c)
    GROUP BY fc.following_id
  ),
  scored AS (
    SELECT
      c.id,
      c.content,
      c.rating,
      c.tags,
      c.created_at,
      c.edited_at,
      c.status,
      c.user_id,
      c.building_id,
      c.views_count,
      COALESCE(la.cnt, 0)              AS likes_cnt,
      COALESCE(ca2.cnt, 0)             AS comments_cnt,
      COALESCE(ica.img_cnt, 0)         AS image_cnt,
      (c.video_url IS NOT NULL)        AS has_video,
      EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600.0  AS freshness_hours
    FROM candidates c
    LEFT JOIN likes_agg la        ON la.interaction_id = c.id
    LEFT JOIN comments_agg ca2    ON ca2.interaction_id = c.id
    LEFT JOIN images_count_agg ica ON ica.review_id = c.id
  ),
  ranked AS (
    SELECT
      s.*,
      -- Scoring formula — weights tunable here and in scoreFeedItem.ts (client)
      EXP(-LN(2) * s.freshness_hours / 36.0)
        * (1.0 + 0.5 * LEAST(
            (s.likes_cnt + 2.0 * s.comments_cnt) / GREATEST(1.0, s.freshness_hours),
            10.0
          ))
        * CASE
            WHEN s.has_video     THEN 1.6
            WHEN s.image_cnt >= 3 THEN 1.4
            WHEN s.image_cnt = 2  THEN 1.2
            WHEN s.image_cnt = 1  THEN 1.0
            ELSE 0.7
          END
        AS score
    FROM scored s
    ORDER BY score DESC, s.id DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT
    r.id,
    r.content,
    r.rating,
    r.tags,
    r.created_at,
    r.edited_at,
    r.status::TEXT,
    r.user_id,
    r.building_id,
    jsonb_build_object(
      'id',                       p.id,
      'username',                 p.username,
      'avatar_url',               p.avatar_url,
      'is_verified_architect',    (va.user_id IS NOT NULL),
      'is_architect_of_building', (aob.user_id IS NOT NULL),
      'followers_count',          COALESCE(fcc.cnt, 0)
    ) AS user_data,
    jsonb_build_object(
      'id',                    b.id,
      'name',                  b.name,
      'main_image_url',        public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'address',               b.address,
      'credited_entities',     COALESCE(ca.credited_entities, '[]'::jsonb),
      'year_completed',        b.year_completed,
      'city',                  b.city,
      'country',               b.country,
      'slug',                  b.slug,
      'short_id',              b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug',    loc.city_slug
    ) AS building_data,
    r.likes_cnt                        AS likes_count,
    r.comments_cnt                     AS comments_count,
    r.views_count                      AS views_count,
    (ul.interaction_id IS NOT NULL)    AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb)     AS review_images,
    r.score                            AS score,
    'direct'::TEXT                     AS ring,
    r.freshness_hours                  AS freshness_hours
  FROM ranked r
  LEFT JOIN public.profiles p          ON p.id = r.user_id
  LEFT JOIN public.buildings b         ON b.id = r.building_id
  LEFT JOIN public.localities loc      ON loc.id = b.locality_id
  LEFT JOIN user_likes ul              ON ul.interaction_id = r.id
  LEFT JOIN images_agg ia              ON ia.review_id = r.id
  LEFT JOIN credits_agg ca             ON ca.building_id = r.building_id
  LEFT JOIN verified_architects va     ON va.user_id = r.user_id
  LEFT JOIN architect_of_building aob  ON aob.user_id = r.user_id AND aob.building_id = r.building_id
  LEFT JOIN followers_counts fcc       ON fcc.user_id = r.user_id
  ORDER BY r.score DESC, r.id DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_feed_ranked(INT, INT) TO authenticated;

COMMIT;
