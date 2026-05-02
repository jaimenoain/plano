-- =============================================================================
-- Migration: optimize_feed_rpcs
-- Purpose:   Eliminate N+1 correlated subqueries in get_feed and
--            get_suggested_posts by rewriting them with batch CTEs.
--            Also adds review_images to get_suggested_posts so the client
--            no longer needs two extra round-trips per page, and adds
--            missing indexes on hot query paths.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Indexes
-- -----------------------------------------------------------------------------

-- follows: follower_id is the primary filter in the feed WHERE clause
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);

-- follows: following_id is used for followers_count aggregation
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- likes: (user_id, interaction_id) covers the is_liked per-user check
CREATE INDEX IF NOT EXISTS idx_likes_user_id_interaction_id ON likes(user_id, interaction_id);

-- image_likes: (user_id, image_id) covers the per-image is_liked check
CREATE INDEX IF NOT EXISTS idx_image_likes_user_id_image_id ON image_likes(user_id, image_id);

-- review_images: review_id is used to look up images per review
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);

-- user_buildings: (user_id, status) covers the feed filter
CREATE INDEX IF NOT EXISTS idx_user_buildings_user_id_status ON user_buildings(user_id, status);

-- -----------------------------------------------------------------------------
-- 2. get_feed — rewrite with batch CTEs
-- -----------------------------------------------------------------------------
-- Before: ~8+ correlated subqueries executed once per returned row.
-- After:  one CTE per concern, each scanning its table once across all rows.

CREATE OR REPLACE FUNCTION get_feed(p_limit INT, p_offset INT)
RETURNS TABLE (
  id UUID,
  content TEXT,
  rating INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  status TEXT,
  user_id UUID,
  building_id UUID,
  user_data JSONB,
  building_data JSONB,
  likes_count BIGINT,
  comments_count BIGINT,
  is_liked BOOLEAN,
  review_images JSONB
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH feed_page AS (
    -- Step 1: paginate with minimal joins; all enrichment happens below
    SELECT
      ub.id,
      ub.content,
      ub.rating,
      ub.tags,
      ub.created_at,
      ub.edited_at,
      ub.status,
      ub.user_id,
      ub.building_id,
      COALESCE(ub.edited_at, ub.created_at) AS sort_at
    FROM user_buildings ub
    WHERE
      (ub.user_id = v_user_id
       OR ub.user_id IN (SELECT following_id FROM follows WHERE follower_id = v_user_id))
      AND ub.status != 'ignored'
    ORDER BY COALESCE(ub.edited_at, ub.created_at) DESC
    LIMIT p_limit OFFSET p_offset
  ),
  -- Step 2: batch-count likes for all fetched reviews in one scan
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM likes l
    WHERE l.interaction_id IN (SELECT id FROM feed_page)
    GROUP BY l.interaction_id
  ),
  -- Step 3: batch-count comments
  comments_agg AS (
    SELECT c.interaction_id, COUNT(*) AS cnt
    FROM comments c
    WHERE c.interaction_id IN (SELECT id FROM feed_page)
    GROUP BY c.interaction_id
  ),
  -- Step 4: current user's liked reviews (single lookup)
  user_likes AS (
    SELECT l.interaction_id
    FROM likes l
    WHERE l.interaction_id IN (SELECT id FROM feed_page)
      AND l.user_id = v_user_id
  ),
  -- Step 5: batch-aggregate images with per-image is_liked
  images_agg AS (
    SELECT
      ri.review_id,
      jsonb_agg(
        jsonb_build_object(
          'id', ri.id,
          'storage_path', ri.storage_path,
          'likes_count', ri.likes_count,
          'is_liked', (il.image_id IS NOT NULL)
        )
      ) AS imgs
    FROM review_images ri
    LEFT JOIN image_likes il ON il.image_id = ri.id AND il.user_id = v_user_id
    WHERE ri.review_id IN (SELECT id FROM feed_page)
    GROUP BY ri.review_id
  ),
  -- Step 6: batch-aggregate credited entities per building
  credits_agg AS (
    SELECT
      bc.building_id,
      jsonb_agg(
        jsonb_build_object(
          'name', COALESCE(pp.name, cc.name),
          'id', COALESCE(bc.person_id, bc.company_id)
        )
        ORDER BY COALESCE(pp.name, cc.name)
      ) FILTER (WHERE COALESCE(pp.name, cc.name) IS NOT NULL) AS credited_entities
    FROM building_credits bc
    LEFT JOIN public.people pp ON bc.person_id = pp.id
    LEFT JOIN public.companies cc ON bc.company_id = cc.id
    WHERE bc.building_id IN (SELECT DISTINCT building_id FROM feed_page)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  -- Step 7: which users in this page are verified architects
  verified_architects AS (
    SELECT DISTINCT pe.claimed_by_user_id AS user_id
    FROM public.people pe
    WHERE pe.claimed_by_user_id IN (SELECT DISTINCT user_id FROM feed_page)
      AND pe.claim_status::text IN ('claimed', 'verified')
  ),
  -- Step 8: which (user, building) pairs have the user as a credited architect
  architect_of_building AS (
    SELECT DISTINCT fp.user_id, fp.building_id
    FROM feed_page fp
    JOIN public.building_credits bc ON bc.building_id = fp.building_id
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    WHERE EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.id = bc.person_id AND pe.claimed_by_user_id = fp.user_id
      ) OR EXISTS (
        SELECT 1 FROM public.company_stewards cs
        WHERE cs.company_id = bc.company_id AND cs.user_id = fp.user_id
      )
  ),
  -- Step 9: follower counts for all users in the page
  followers_counts AS (
    SELECT fc.following_id AS user_id, COUNT(*) AS cnt
    FROM public.follows fc
    WHERE fc.following_id IN (SELECT DISTINCT user_id FROM feed_page)
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
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified_architect', (va.user_id IS NOT NULL),
      'is_architect_of_building', (aob.user_id IS NOT NULL),
      'followers_count', COALESCE(fcc.cnt, 0)
    ) AS user_data,
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'main_image_url', public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'address', b.address,
      'credited_entities', COALESCE(ca.credited_entities, '[]'::jsonb),
      'year_completed', b.year_completed,
      'city', b.city,
      'country', b.country,
      'slug', b.slug,
      'short_id', b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug', loc.city_slug
    ) AS building_data,
    COALESCE(la.cnt, 0) AS likes_count,
    COALESCE(cmta.cnt, 0) AS comments_count,
    (ul.interaction_id IS NOT NULL) AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb) AS review_images
  FROM feed_page fp
  LEFT JOIN profiles p ON p.id = fp.user_id
  LEFT JOIN buildings b ON b.id = fp.building_id
  LEFT JOIN localities loc ON loc.id = b.locality_id
  LEFT JOIN likes_agg la ON la.interaction_id = fp.id
  LEFT JOIN comments_agg cmta ON cmta.interaction_id = fp.id
  LEFT JOIN user_likes ul ON ul.interaction_id = fp.id
  LEFT JOIN images_agg ia ON ia.review_id = fp.id
  LEFT JOIN credits_agg ca ON ca.building_id = fp.building_id
  LEFT JOIN verified_architects va ON va.user_id = fp.user_id
  LEFT JOIN architect_of_building aob ON aob.user_id = fp.user_id AND aob.building_id = fp.building_id
  LEFT JOIN followers_counts fcc ON fcc.user_id = fp.user_id
  ORDER BY fp.sort_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- -----------------------------------------------------------------------------
-- 3. get_suggested_posts — rewrite with batch CTEs + add review_images
-- -----------------------------------------------------------------------------
-- Before: N+1 subqueries in CTE + two extra client-side round-trips for images.
-- After:  batch CTEs, review_images included in the RPC response.

DROP FUNCTION IF EXISTS get_suggested_posts(INT, INT);

CREATE OR REPLACE FUNCTION get_suggested_posts(p_limit INT, p_offset INT)
RETURNS TABLE (
  id UUID,
  content TEXT,
  rating INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  status TEXT,
  user_id UUID,
  building_id UUID,
  user_data JSONB,
  building_data JSONB,
  likes_count BIGINT,
  comments_count BIGINT,
  is_liked BOOLEAN,
  review_images JSONB,
  is_suggested BOOLEAN,
  suggestion_reason TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH candidate_posts AS (
    -- Exclude the viewer's own posts and posts from followed users
    SELECT
      ub.id,
      ub.content,
      ub.rating,
      ub.tags,
      ub.created_at,
      ub.edited_at,
      ub.status,
      ub.user_id,
      ub.building_id
    FROM user_buildings ub
    LEFT JOIN buildings b ON b.id = ub.building_id
    WHERE
      ub.user_id != v_user_id
      AND ub.user_id NOT IN (SELECT following_id FROM follows WHERE follower_id = v_user_id)
      AND ub.status NOT IN ('ignored', 'hidden')
      AND (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
  ),
  likes_agg AS (
    SELECT l.interaction_id, COUNT(*) AS cnt
    FROM likes l
    WHERE l.interaction_id IN (SELECT id FROM candidate_posts)
    GROUP BY l.interaction_id
  ),
  -- Rank and paginate after computing likes so ORDER BY can use likes_count
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
    FROM comments c
    WHERE c.interaction_id IN (SELECT id FROM ranked_page)
    GROUP BY c.interaction_id
  ),
  user_likes AS (
    SELECT l.interaction_id
    FROM likes l
    WHERE l.interaction_id IN (SELECT id FROM ranked_page)
      AND l.user_id = v_user_id
  ),
  images_agg AS (
    SELECT
      ri.review_id,
      jsonb_agg(
        jsonb_build_object(
          'id', ri.id,
          'storage_path', ri.storage_path,
          'likes_count', ri.likes_count,
          'is_liked', (il.image_id IS NOT NULL)
        )
      ) AS imgs
    FROM review_images ri
    LEFT JOIN image_likes il ON il.image_id = ri.id AND il.user_id = v_user_id
    WHERE ri.review_id IN (SELECT id FROM ranked_page)
    GROUP BY ri.review_id
  ),
  credits_agg AS (
    SELECT
      bc.building_id,
      jsonb_agg(
        jsonb_build_object(
          'name', COALESCE(pp.name, cc.name),
          'id', COALESCE(bc.person_id, bc.company_id)
        )
        ORDER BY COALESCE(pp.name, cc.name)
      ) FILTER (WHERE COALESCE(pp.name, cc.name) IS NOT NULL) AS credited_entities
    FROM building_credits bc
    LEFT JOIN public.people pp ON bc.person_id = pp.id
    LEFT JOIN public.companies cc ON bc.company_id = cc.id
    WHERE bc.building_id IN (SELECT DISTINCT building_id FROM ranked_page)
      AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
    GROUP BY bc.building_id
  ),
  verified_architects AS (
    SELECT DISTINCT pe.claimed_by_user_id AS user_id
    FROM public.people pe
    WHERE pe.claimed_by_user_id IN (SELECT DISTINCT user_id FROM ranked_page)
      AND pe.claim_status::text IN ('claimed', 'verified')
  ),
  architect_of_building AS (
    SELECT DISTINCT rp.user_id, rp.building_id
    FROM ranked_page rp
    JOIN public.building_credits bc ON bc.building_id = rp.building_id
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
    WHERE fc.following_id IN (SELECT DISTINCT user_id FROM ranked_page)
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
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified_architect', (va.user_id IS NOT NULL),
      'is_architect_of_building', (aob.user_id IS NOT NULL),
      'followers_count', COALESCE(fcc.cnt, 0)
    ) AS user_data,
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'main_image_url', public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'address', b.address,
      'credited_entities', COALESCE(ca.credited_entities, '[]'::jsonb),
      'year_completed', b.year_completed,
      'city', b.city,
      'country', b.country,
      'slug', b.slug,
      'short_id', b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug', loc.city_slug
    ) AS building_data,
    rp.likes_count,
    COALESCE(cmta.cnt, 0) AS comments_count,
    (ul.interaction_id IS NOT NULL) AS is_liked,
    COALESCE(ia.imgs, '[]'::jsonb) AS review_images,
    TRUE AS is_suggested,
    'Popular'::TEXT AS suggestion_reason
  FROM ranked_page rp
  LEFT JOIN profiles p ON p.id = rp.user_id
  LEFT JOIN buildings b ON b.id = rp.building_id
  LEFT JOIN localities loc ON loc.id = b.locality_id
  LEFT JOIN comments_agg cmta ON cmta.interaction_id = rp.id
  LEFT JOIN user_likes ul ON ul.interaction_id = rp.id
  LEFT JOIN images_agg ia ON ia.review_id = rp.id
  LEFT JOIN credits_agg ca ON ca.building_id = rp.building_id
  LEFT JOIN verified_architects va ON va.user_id = rp.user_id
  LEFT JOIN architect_of_building aob ON aob.user_id = rp.user_id AND aob.building_id = rp.building_id
  LEFT JOIN followers_counts fcc ON fcc.user_id = rp.user_id
  ORDER BY
    (rp.likes_count * 2 + COALESCE(rp.rating, 0) * 2) DESC,
    rp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
