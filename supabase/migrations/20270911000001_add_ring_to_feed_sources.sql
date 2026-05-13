-- =============================================================================
-- Migration: add_ring_to_feed_sources
-- Purpose:   Phase 2 — adds a `ring` column to get_collections_feed and
--            get_suggested_posts so both RPCs return ring context for the
--            client-side feed merger introduced in Phase 2.
--
--   get_collections_feed  → ring = 'direct'  (all results are from followed users)
--   get_suggested_posts   → ring = 'open'    (globally trending / discovery)
--
-- Both functions use CREATE OR REPLACE so GRANTs survive without re-grant.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. get_collections_feed
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_collections_feed(integer, integer);

CREATE OR REPLACE FUNCTION public.get_collections_feed(p_limit integer, p_offset integer)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  updated_at timestamptz,
  owner_id uuid,
  primary_tag text,
  owner jsonb,
  preview_buildings jsonb,
  building_count bigint,
  ring text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.description,
    c.updated_at,
    c.owner_id,
    (
      SELECT a.name
      FROM collection_items ci_pt
      JOIN buildings b_pt ON b_pt.id = ci_pt.building_id
      JOIN building_attributes batt ON batt.building_id = b_pt.id
      JOIN attributes a ON a.id = batt.attribute_id
      JOIN attribute_groups ag ON ag.id = a.group_id AND ag.slug = 'style'
      WHERE ci_pt.collection_id = c.id
        AND ci_pt.is_hidden = false
        AND (b_pt.is_deleted IS FALSE OR b_pt.is_deleted IS NULL)
      ORDER BY ci_pt.order_index
      LIMIT 1
    ) AS primary_tag,
    jsonb_build_object(
      'username', p.username,
      'avatar_url', p.avatar_url
    ) AS owner,
    COALESCE(
      (
        SELECT jsonb_agg(x.obj ORDER BY x.order_index)
        FROM (
          SELECT
            jsonb_build_object(
              'building_id', b3.id,
              'name', b3.name,
              'main_image_url', b3.main_image_url
            ) AS obj,
            ci3.order_index
          FROM collection_items ci3
          JOIN buildings b3 ON b3.id = ci3.building_id
          WHERE ci3.collection_id = c.id
            AND ci3.is_hidden = false
            AND (b3.is_deleted IS FALSE OR b3.is_deleted IS NULL)
          ORDER BY ci3.order_index
          LIMIT 4
        ) x
      ),
      '[]'::jsonb
    ) AS preview_buildings,
    (
      SELECT COUNT(*)::bigint
      FROM collection_items ci5
      WHERE ci5.collection_id = c.id
        AND ci5.is_hidden = false
    ) AS building_count,
    'direct'::TEXT AS ring
  FROM collections c
  LEFT JOIN profiles p ON p.id = c.owner_id
  WHERE c.is_public = true
    AND c.owner_id IN (
      SELECT following_id FROM follows WHERE follower_id = v_uid
    )
  ORDER BY c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_collections_feed(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_collections_feed(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_collections_feed(integer, integer) TO authenticated;

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
  suggestion_reason TEXT,
  ring            TEXT
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
  WITH candidate_posts AS (
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
      bp.views_count
    FROM public.building_posts bp
    JOIN public.user_buildings ub
      ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
    LEFT JOIN public.buildings b ON b.id = bp.building_id
    WHERE
      bp.user_id != v_user_id
      AND bp.user_id NOT IN (SELECT following_id FROM public.follows WHERE follower_id = v_user_id)
      -- Suggested posts should be public
      AND COALESCE(bp.visibility, 'public') = 'public'
      AND ub.status NOT IN ('ignored', 'hidden')
      AND (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
      -- Allow visited/pending cards in suggestions too
      AND (
        bp.body       IS NOT NULL
        OR bp.tags    IS NOT NULL
        OR bp.video_url IS NOT NULL
        OR (ub.status IN ('visited', 'pending'))
        OR EXISTS (SELECT 1 FROM public.review_images ri WHERE ri.review_id = bp.id)
      )
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT cp.id FROM candidate_posts cp)
    GROUP BY l.interaction_id
  ),
  ranked_page AS (
    SELECT
      cp.*,
      COALESCE(la.cnt, 0) AS likes_count
    FROM candidate_posts cp
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
    'Popular'::TEXT                 AS suggestion_reason,
    'open'::TEXT                    AS ring
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
