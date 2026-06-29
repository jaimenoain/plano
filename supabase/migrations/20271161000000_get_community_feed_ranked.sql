-- =============================================================================
-- Migration: get_community_feed_ranked
-- Purpose:   "Discover from the community" feed — posts from authors the viewer
--            does NOT follow (and that are not the viewer's own), ranked by a
--            composite score that blends popularity, location relevance, and
--            social proximity. Powers the second section of the home feed.
--
-- Returns the same shape as get_feed_ranked plus discovery-specific columns:
--   connectors        JSONB  — up to 3 first-degree contacts who follow the
--                              author (the "Followed by XYZ" facepile); [] if none
--   connectors_count  INT    — total such contacts (so the UI can say "+N")
--   location_match    TEXT   — 'city' | 'country' | NULL
--   is_suggested      BOOL   — always true (these are discovery cards)
--   suggestion_reason TEXT   — strongest signal, for the card badge
--   ring              INT    — 2 when the author is a second-degree contact, else 3
--
-- Scoring formula (weights tunable here; longer half-life than the followed
-- ranker because discovery is not recency-driven):
--   freshness_decay = exp(-ln(2) * hours / 72)                 -- 72h half-life
--   popularity      = likes + 2*comments + 0.05*author_followers
--   engagement      = 1.0 + 0.5 * LEAST(popularity / GREATEST(1, hours), 10)
--   media_quality   = 1.6 video | 1.4 (3+ img) | 1.2 (2) | 1.0 (1) | 0.7 text
--   location_boost  = 1.6 city | 1.25 country | 1.0 none
--   ring_boost      = 1.5 if second-degree else 1.0
--   seen_penalty    = 0.15 if already seen else 1.0            -- fade, don't hide
--   score = freshness_decay * engagement * media_quality
--         * location_boost * ring_boost * seen_penalty
--
-- Candidate pool capped at the 1000 most-recent eligible posts to keep the
-- scoring pass tractable (mirrors get_feed_ranked's 500 cap on a wider window).
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS get_community_feed_ranked(integer, integer);

CREATE OR REPLACE FUNCTION get_community_feed_ranked(p_limit INT, p_offset INT)
RETURNS TABLE (
  id                UUID,
  content           TEXT,
  rating            INTEGER,
  tags              TEXT[],
  created_at        TIMESTAMPTZ,
  edited_at         TIMESTAMPTZ,
  status            TEXT,
  user_id           UUID,
  building_id       UUID,
  user_data         JSONB,
  building_data     JSONB,
  likes_count       BIGINT,
  comments_count    BIGINT,
  views_count       BIGINT,
  is_liked          BOOLEAN,
  review_images     JSONB,
  score             DOUBLE PRECISION,
  ring              INT,
  freshness_hours   DOUBLE PRECISION,
  connectors        JSONB,
  connectors_count  INT,
  location_match    TEXT,
  is_suggested      BOOLEAN,
  suggestion_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- Prefer column references over the RETURNS TABLE OUT-parameter names (id,
-- user_id, content, …) so bare references inside CTEs are never read as
-- PL/pgSQL variables.
#variable_conflict use_column
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH viewer_loc AS (
    SELECT
      NULLIF(lower(btrim(split_part(pr.location, ',', 1))), '') AS city_token,
      pr.country                                                AS country_code
    FROM public.profiles pr
    WHERE pr.id = v_user_id
  ),
  candidates AS (
    -- Posts from authors the viewer does not follow and that are not the
    -- viewer's own. Public only (non-followers can't see contacts-only posts).
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
    JOIN public.user_buildings ub
      ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
    LEFT JOIN public.buildings b ON b.id = bp.building_id
    WHERE
      bp.user_id <> v_user_id
      AND bp.user_id NOT IN (
        SELECT following_id FROM public.follows WHERE follower_id = v_user_id
      )
      AND COALESCE(bp.visibility, 'public') = 'public'
      AND ub.status NOT IN ('ignored', 'hidden')
      AND (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
      AND (
        bp.body         IS NOT NULL
        OR bp.tags      IS NOT NULL
        OR bp.video_url IS NOT NULL
        OR EXISTS (SELECT 1 FROM public.review_images ri WHERE ri.review_id = bp.id)
      )
    ORDER BY bp.created_at DESC
    LIMIT 1000
  ),
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
  -- Followers per candidate author (popularity signal + connector ordering).
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT c.user_id FROM candidates c)
    GROUP BY fc.following_id
  ),
  -- Second-degree "Followed by XYZ": first-degree contacts (viewer -> X) who in
  -- turn follow a candidate author (X -> author). Ordered by the connector's own
  -- follower count so the most prominent name surfaces first.
  connectors AS (
    SELECT
      f2.following_id AS author_id,
      jsonb_agg(
        jsonb_build_object(
          'id',         pc.id,
          'username',   pc.username,
          'avatar_url', pc.avatar_url
        )
        ORDER BY COALESCE(fc.cnt, 0) DESC, pc.username
      ) FILTER (WHERE pc.id IS NOT NULL) AS conns,
      COUNT(*) AS cnt
    FROM public.follows f1
    JOIN public.follows f2 ON f2.follower_id = f1.following_id
    JOIN public.profiles pc ON pc.id = f1.following_id
    LEFT JOIN followers_counts fc ON fc.user_id = f1.following_id
    WHERE f1.follower_id = v_user_id
      AND f2.following_id IN (SELECT DISTINCT c.user_id FROM candidates c)
    GROUP BY f2.following_id
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
      COALESCE(la.cnt, 0)       AS likes_cnt,
      COALESCE(ca2.cnt, 0)      AS comments_cnt,
      COALESCE(ica.img_cnt, 0)  AS image_cnt,
      (c.video_url IS NOT NULL) AS has_video,
      COALESCE(fcc.cnt, 0)      AS author_followers,
      (EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600.0)::double precision AS freshness_hours,
      (nv.note_id IS NOT NULL)  AS is_seen,
      CASE
        WHEN vl.city_token IS NOT NULL
             AND (lower(b.city) = vl.city_token OR lower(loc.city) = vl.city_token)
          THEN 'city'
        WHEN vl.country_code IS NOT NULL
             AND (vl.country_code = loc.country_code OR lower(vl.country_code) = lower(b.country))
          THEN 'country'
        ELSE NULL
      END AS location_match,
      COALESCE(conn.cnt, 0)::int AS connectors_count,
      conn.conns                AS connectors_json
    FROM candidates c
    LEFT JOIN public.buildings b   ON b.id = c.building_id
    LEFT JOIN public.localities loc ON loc.id = b.locality_id
    LEFT JOIN likes_agg la         ON la.interaction_id = c.id
    LEFT JOIN comments_agg ca2     ON ca2.interaction_id = c.id
    LEFT JOIN images_count_agg ica ON ica.review_id = c.id
    LEFT JOIN followers_counts fcc ON fcc.user_id = c.user_id
    LEFT JOIN public.note_views nv ON nv.note_id = c.id AND nv.viewer_id = v_user_id
    LEFT JOIN connectors conn      ON conn.author_id = c.user_id
    LEFT JOIN viewer_loc vl        ON TRUE
  ),
  ranked AS (
    SELECT
      s.*,
      (EXP(-LN(2) * s.freshness_hours / 72.0)
        * (1.0 + 0.5 * LEAST(
            (s.likes_cnt + 2.0 * s.comments_cnt + 0.05 * s.author_followers)
              / GREATEST(1.0, s.freshness_hours),
            10.0
          ))
        * CASE
            WHEN s.has_video     THEN 1.6
            WHEN s.image_cnt >= 3 THEN 1.4
            WHEN s.image_cnt = 2  THEN 1.2
            WHEN s.image_cnt = 1  THEN 1.0
            ELSE 0.7
          END
        * CASE s.location_match
            WHEN 'city'    THEN 1.6
            WHEN 'country' THEN 1.25
            ELSE 1.0
          END
        * CASE WHEN s.connectors_count > 0 THEN 1.5 ELSE 1.0 END
        * CASE WHEN s.is_seen THEN 0.15 ELSE 1.0 END)::double precision
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
      'followers_count',          r.author_followers
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
    r.likes_cnt                      AS likes_count,
    r.comments_cnt                   AS comments_count,
    r.views_count                    AS views_count,
    (ul.interaction_id IS NOT NULL)  AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb)   AS review_images,
    r.score                          AS score,
    CASE WHEN r.connectors_count > 0 THEN 2 ELSE 3 END AS ring,
    r.freshness_hours                AS freshness_hours,
    -- Trim connector list to the top 3 (already ordered by prominence).
    COALESCE((
      SELECT jsonb_agg(t.elem ORDER BY t.ord)
      FROM jsonb_array_elements(r.connectors_json) WITH ORDINALITY AS t(elem, ord)
      WHERE t.ord <= 3
    ), '[]'::jsonb)                  AS connectors,
    r.connectors_count               AS connectors_count,
    r.location_match                 AS location_match,
    TRUE                             AS is_suggested,
    CASE
      WHEN r.connectors_count > 0
        THEN 'Followed by ' || COALESCE(r.connectors_json -> 0 ->> 'username', 'a contact')
      WHEN r.location_match = 'city'    THEN 'In your city'
      WHEN r.location_match = 'country' THEN 'In your country'
      ELSE 'Popular'
    END                              AS suggestion_reason
  FROM ranked r
  LEFT JOIN public.profiles p          ON p.id = r.user_id
  LEFT JOIN public.buildings b         ON b.id = r.building_id
  LEFT JOIN public.localities loc      ON loc.id = b.locality_id
  LEFT JOIN user_likes ul              ON ul.interaction_id = r.id
  LEFT JOIN images_agg ia              ON ia.review_id = r.id
  LEFT JOIN credits_agg ca             ON ca.building_id = r.building_id
  LEFT JOIN verified_architects va     ON va.user_id = r.user_id
  LEFT JOIN architect_of_building aob  ON aob.user_id = r.user_id AND aob.building_id = r.building_id
  ORDER BY r.score DESC, r.id DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_community_feed_ranked(INT, INT) TO authenticated;

COMMIT;
