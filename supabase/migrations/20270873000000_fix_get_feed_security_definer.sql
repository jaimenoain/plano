-- =============================================================================
-- Migration: fix_get_feed_security_definer
-- Problem:   get_feed (20270872000000) runs as SECURITY INVOKER. The query
--            JOINs building_posts ↔ user_buildings while both tables have RLS.
--            The user_buildings RLS policy now queries building_posts to check
--            visibility (since the visibility column was moved there), creating
--            a nested RLS chain that silently returns 0 rows for followed users'
--            posts — causing the feed to show the cold-start "Get started" screen.
-- Fix:       Rewrite get_feed as SECURITY DEFINER so it runs as the function
--            owner and bypasses RLS. All access control is reimplemented
--            explicitly in the WHERE clause:
--              • viewer's own posts always visible
--              • followed users' public posts visible to all followers
--              • followed users' contacts posts visible only to followers
--            Also switches user_buildings from INNER to LEFT JOIN so posts are
--            not silently dropped when a building_posts row has no matching
--            user_buildings row (e.g. edge-case inserts or future refactors).
-- =============================================================================

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
  is_liked       BOOLEAN,
  review_images  JSONB
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH feed_page AS (
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
      COALESCE(bp.updated_at, bp.created_at) AS sort_at
    FROM public.building_posts bp
    LEFT JOIN public.user_buildings ub
      ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
    WHERE
      -- Only the viewer's own posts and posts from followed users
      (bp.user_id = v_user_id
       OR bp.user_id IN (SELECT following_id FROM follows WHERE follower_id = v_user_id))
      -- Exclude ignored interactions (LEFT JOIN: treat null status as non-ignored)
      AND (ub.status IS NULL OR ub.status != 'ignored')
      -- Explicit visibility filter (replaces RLS chain)
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
      -- Only posts with actual content (pure rating/status entries stay off the feed)
      AND (
        bp.body         IS NOT NULL
        OR bp.tags      IS NOT NULL
        OR bp.video_url IS NOT NULL
        OR EXISTS (SELECT 1 FROM public.review_images ri WHERE ri.review_id = bp.id)
      )
    ORDER BY COALESCE(bp.updated_at, bp.created_at) DESC
    LIMIT p_limit OFFSET p_offset
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT fp_id.id FROM feed_page fp_id)
    GROUP BY l.interaction_id
  ),
  comments_agg AS (
    SELECT c.interaction_id, COUNT(*) AS cnt
    FROM public.comments c
    WHERE c.interaction_id IN (SELECT fp_id.id FROM feed_page fp_id)
    GROUP BY c.interaction_id
  ),
  user_likes AS (
    SELECT l.interaction_id
    FROM public.likes l
    WHERE l.interaction_id IN (SELECT fp_id.id FROM feed_page fp_id)
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
    WHERE ri.review_id IN (SELECT fp_id.id FROM feed_page fp_id)
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
    WHERE bc.building_id IN (SELECT DISTINCT fp_id.building_id FROM feed_page fp_id)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  verified_architects AS (
    SELECT DISTINCT pe.claimed_by_user_id AS user_id
    FROM public.people pe
    WHERE pe.claimed_by_user_id IN (SELECT DISTINCT fp_id.user_id FROM feed_page fp_id)
      AND pe.claim_status::text IN ('claimed', 'verified')
  ),
  architect_of_building AS (
    SELECT DISTINCT fp_id.user_id, fp_id.building_id
    FROM feed_page fp_id
    JOIN public.building_credits bc
      ON bc.building_id = fp_id.building_id
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    WHERE EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = fp_id.user_id
      ) OR EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = bc.company_id AND cs.user_id = fp_id.user_id
      )
  ),
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT fp_id.user_id FROM feed_page fp_id)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
