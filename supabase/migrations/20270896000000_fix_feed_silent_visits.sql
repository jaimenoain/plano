-- =============================================================================
-- Migration: fix_feed_silent_visits
-- Purpose:   Ensure "silent visits" (visited/pending status changes without a 
--            corresponding building_posts note) appear in the social and 
--            discovery feeds.
--
-- Issue:     Previous versions of get_feed started from public.building_posts.
--            Since the app does not currently create an empty post for every 
--            status change, new "Visited" or "Added to Pending" actions were 
--            invisible in the feed unless a note was also written.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. get_feed
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_feed(integer, integer);

CREATE OR REPLACE FUNCTION get_feed(p_limit INT, p_offset INT)
RETURNS TABLE (
  id             UUID,
  content        TEXT,
  rating         INTEGER,
  tags           TEXT[],
  created_at     TIMESTAMPTZ,
  edited_at      TIMESTAMPTZ,
  status         TEXT,
  user_id        UUID,
  building_id    UUID,
  user_data      JSONB,
  building_data  JSONB,
  likes_count    BIGINT,
  comments_count BIGINT,
  views_count    BIGINT,
  is_liked       BOOLEAN,
  review_images  JSONB
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
  WITH feed_items AS (
    -- All posts (notes, images, videos)
    SELECT
      bp.id,
      bp.user_id,
      bp.building_id,
      bp.body        AS content,
      bp.tags,
      bp.created_at,
      bp.updated_at  AS edited_at,
      bp.visibility,
      bp.views_count
    FROM public.building_posts bp
    
    UNION ALL
    
    -- Silent visits (status changed but no post created)
    -- We use the user_buildings ID so it has a unique stable ID in the feed.
    SELECT
      ub.id,
      ub.user_id,
      ub.building_id,
      NULL           AS content,
      NULL           AS tags,
      ub.created_at,
      ub.created_at  AS edited_at,
      'public'       AS visibility,
      0              AS views_count
    FROM public.user_buildings ub
    WHERE NOT EXISTS (
      SELECT 1 FROM public.building_posts bp 
      WHERE bp.user_id = ub.user_id AND bp.building_id = ub.building_id
    )
    AND ub.status IN ('visited', 'pending')
  ),
  feed_page AS (
    SELECT
      fi.id,
      fi.content,
      ub.rating,
      fi.tags,
      fi.created_at,
      fi.edited_at,
      ub.status,
      fi.user_id,
      fi.building_id,
      fi.views_count,
      COALESCE(fi.edited_at, fi.created_at) AS sort_at,
      fi.visibility
    FROM feed_items fi
    LEFT JOIN public.user_buildings ub
      ON ub.user_id = fi.user_id AND ub.building_id = fi.building_id
    WHERE
      -- Visibility / Relationship check
      (fi.user_id = v_user_id
       OR fi.user_id IN (SELECT following_id FROM public.follows WHERE follower_id = v_user_id))
      -- RLS mimicry
      AND (
        fi.user_id = v_user_id
        OR COALESCE(fi.visibility, 'public') = 'public'
        OR (
          fi.visibility = 'contacts'
          AND EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.follower_id = v_user_id AND f.following_id = fi.user_id
          )
        )
      )
      -- Status check (ignore if explicitly ignored)
      AND (ub.status IS NULL OR ub.status != 'ignored')
    ORDER BY COALESCE(fi.edited_at, fi.created_at) DESC
    LIMIT p_limit OFFSET p_offset
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT fp.id FROM feed_page fp)
    GROUP BY l.interaction_id
  ),
  comments_agg AS (
    SELECT c.interaction_id, COUNT(*) AS cnt
    FROM public.comments c
    WHERE c.interaction_id IN (SELECT fp.id FROM feed_page fp)
    GROUP BY c.interaction_id
  ),
  user_likes AS (
    SELECT l.interaction_id
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT fp.id FROM feed_page fp)
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
    WHERE ri.review_id IN (SELECT fp.id FROM feed_page fp)
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
    WHERE bc.building_id IN (SELECT DISTINCT fp.building_id FROM feed_page fp)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  verified_architects AS (
    SELECT DISTINCT user_id FROM (
      SELECT pe.claimed_by_user_id AS user_id FROM public.people pe WHERE pe.claim_status::text IN ('claimed', 'verified')
      UNION
      SELECT cs.user_id FROM public.company_stewards cs JOIN public.companies c ON cs.company_id = c.id WHERE cs.role = 'owner' AND c.claim_status::text IN ('claimed', 'verified')
    ) sub
    WHERE user_id IN (SELECT DISTINCT fp.user_id FROM feed_page fp)
  ),
  architect_of_building AS (
    SELECT DISTINCT fp.user_id, fp.building_id
    FROM feed_page fp
    JOIN public.building_credits bc
      ON bc.building_id = fp.building_id
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    WHERE EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = fp.user_id
      ) OR EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = bc.company_id AND cs.user_id = fp.user_id
      )
  ),
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT fp.user_id FROM feed_page fp)
    GROUP BY fc.following_id
  )
  SELECT
    fp.id,
    fp.content,
    fp.rating,
    fp.tags,
    fp.created_at,
    fp.edited_at,
    fp.status::TEXT,
    fp.user_id,
    fp.building_id,
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
    COALESCE(la.cnt, 0)               AS likes_count,
    COALESCE(cmta.cnt, 0)             AS comments_count,
    fp.views_count                    AS views_count,
    (ul.interaction_id IS NOT NULL)   AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb)    AS review_images
  FROM feed_page fp
  LEFT JOIN public.profiles p            ON p.id = fp.user_id
  LEFT JOIN public.buildings b           ON b.id = fp.building_id
  LEFT JOIN public.localities loc        ON loc.id = b.locality_id
  LEFT JOIN likes_agg la                 ON la.interaction_id = fp.id
  LEFT JOIN comments_agg cmta            ON cmta.interaction_id = fp.id
  LEFT JOIN user_likes ul                ON ul.interaction_id = fp.id
  LEFT JOIN images_agg ia                ON ia.review_id = fp.id
  LEFT JOIN credits_agg ca               ON ca.building_id = fp.building_id
  LEFT JOIN verified_architects va       ON va.user_id = fp.user_id
  LEFT JOIN architect_of_building aob
    ON aob.user_id = fp.user_id AND aob.building_id = fp.building_id
  LEFT JOIN followers_counts fcc         ON fcc.user_id = fp.user_id
  ORDER BY fp.sort_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_feed(INT, INT) TO authenticated;


-- -----------------------------------------------------------------------------
-- 2. get_suggested_posts
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_suggested_posts(integer, integer);

CREATE OR REPLACE FUNCTION get_suggested_posts(p_limit INT, p_offset INT)
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
  is_suggested    BOOLEAN,
  suggestion_reason TEXT
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
  WITH candidate_items AS (
    -- All public posts not from self/followed
    SELECT
      bp.id,
      bp.body        AS content,
      bp.tags,
      bp.created_at,
      bp.updated_at  AS edited_at,
      bp.user_id,
      bp.building_id,
      bp.views_count,
      bp.visibility
    FROM public.building_posts bp
    WHERE bp.user_id != v_user_id
      AND bp.user_id NOT IN (SELECT following_id FROM public.follows WHERE follower_id = v_user_id)
      AND COALESCE(bp.visibility, 'public') = 'public'
    
    UNION ALL
    
    -- Public silent visits not from self/followed
    SELECT
      ub.id,
      ub.user_id,
      ub.building_id,
      NULL           AS content,
      NULL           AS tags,
      ub.created_at,
      ub.created_at  AS edited_at,
      0              AS views_count,
      'public'       AS visibility
    FROM public.user_buildings ub
    WHERE ub.user_id != v_user_id
      AND ub.user_id NOT IN (SELECT following_id FROM public.follows WHERE follower_id = v_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.building_posts bp 
        WHERE bp.user_id = ub.user_id AND bp.building_id = ub.building_id
      )
      AND ub.status IN ('visited', 'pending')
  ),
  candidate_page AS (
    SELECT
      ci.*,
      ub.status,
      ub.rating
    FROM candidate_items ci
    JOIN public.user_buildings ub
      ON ub.user_id = ci.user_id AND ub.building_id = ci.building_id
    LEFT JOIN public.buildings b ON b.id = ci.building_id
    WHERE
      ub.status NOT IN ('ignored', 'hidden')
      AND (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT cp.id FROM candidate_page cp)
    GROUP BY l.interaction_id
  ),
  ranked_page AS (
    SELECT
      cp.*,
      COALESCE(la.cnt, 0) AS likes_count
    FROM candidate_page cp
    LEFT JOIN likes_agg la ON la.interaction_id = cp.id
    ORDER BY
      ((COALESCE(cp.rating, 0) * 2) + COALESCE(la.cnt, 0)) DESC,
      cp.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ),
  comments_agg AS (
    SELECT c.interaction_id, COUNT(*) AS cnt
    FROM public.comments c
    WHERE c.interaction_id IN (SELECT rp.id FROM ranked_page rp)
    GROUP BY c.interaction_id
  ),
  user_likes AS (
    SELECT l.interaction_id
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT rp.id FROM ranked_page rp)
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
    WHERE ri.review_id IN (SELECT rp.id FROM ranked_page rp)
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
    WHERE bc.building_id IN (SELECT DISTINCT rp.building_id FROM ranked_page rp)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  verified_architects AS (
    SELECT DISTINCT user_id FROM (
      SELECT pe.claimed_by_user_id AS user_id FROM public.people pe WHERE pe.claim_status::text IN ('claimed', 'verified')
      UNION
      SELECT cs.user_id FROM public.company_stewards cs JOIN public.companies c ON cs.company_id = c.id WHERE cs.role = 'owner' AND c.claim_status::text IN ('claimed', 'verified')
    ) sub
    WHERE user_id IN (SELECT DISTINCT rp.user_id FROM ranked_page rp)
  ),
  architect_of_building AS (
    SELECT DISTINCT rp.user_id, rp.building_id
    FROM ranked_page rp
    JOIN public.building_credits bc
      ON bc.building_id = rp.building_id
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    WHERE EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = rp.user_id
      ) OR EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = bc.company_id AND cs.user_id = rp.user_id
      )
  ),
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT rp.user_id FROM ranked_page rp)
    GROUP BY fc.following_id
  )
  SELECT
    rp.id,
    rp.content,
    rp.rating,
    rp.tags,
    rp.created_at,
    rp.edited_at,
    rp.status::TEXT,
    rp.user_id,
    rp.building_id,
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
    rp.likes_count,
    COALESCE(cmta.cnt, 0)          AS comments_count,
    rp.views_count                 AS views_count,
    (ul.interaction_id IS NOT NULL) AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb) AS review_images,
    TRUE                            AS is_suggested,
    'Popular'::TEXT                 AS suggestion_reason
  FROM ranked_page rp
  LEFT JOIN public.profiles p            ON p.id = rp.user_id
  LEFT JOIN public.buildings b           ON b.id = rp.building_id
  LEFT JOIN public.localities loc        ON loc.id = b.locality_id
  LEFT JOIN comments_agg cmta     ON cmta.interaction_id = rp.id
  LEFT JOIN user_likes ul         ON ul.interaction_id = rp.id
  LEFT JOIN images_agg ia         ON ia.review_id = rp.id
  LEFT JOIN credits_agg ca        ON ca.building_id = rp.building_id
  LEFT JOIN verified_architects va ON va.user_id = rp.user_id
  LEFT JOIN architect_of_building aob
    ON aob.user_id = rp.user_id AND aob.building_id = rp.building_id
  LEFT JOIN followers_counts fcc  ON fcc.user_id = rp.user_id
  ORDER BY
    (rp.likes_count * 2 + COALESCE(rp.rating, 0) * 2) DESC,
    rp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_suggested_posts(INT, INT) TO authenticated;

COMMIT;
