-- =============================================================================
-- Migration: locality_feed_and_leaderboard_urls
-- Purpose:   Add locality_country_code and locality_city_slug to building_data
--            returned by get_feed and get_suggested_posts RPCs, and add the same
--            fields (plus short_id) to get_building_leaderboards results so that
--            the client can construct /architecture/:cc/:city/:id/:slug URLs.
--
-- Depends on: locality_05_add_city_slug (localities.city_slug must exist)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. get_feed — add locality fields to building_data JSON
-- -----------------------------------------------------------------------------

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
  SELECT
    ub.id,
    ub.content,
    ub.rating,
    ub.tags,
    ub.created_at,
    ub.edited_at,
    ub.status::TEXT,
    ub.user_id,
    ub.building_id,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified_architect', EXISTS (SELECT 1 FROM public.people pe WHERE pe.claimed_by_user_id = p.id AND pe.claim_status::text IN ('claimed', 'verified')),
      'is_architect_of_building', EXISTS (
        SELECT 1
        FROM public.building_credits bc
        WHERE bc.building_id = ub.building_id
          AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
          AND (
            bc.person_id IN (SELECT pe_sub.id FROM public.people pe_sub WHERE pe_sub.claimed_by_user_id = p.id)
            OR bc.company_id IN (SELECT cs.company_id FROM public.company_stewards cs WHERE cs.user_id = p.id)
          )
      ),
      'followers_count', (
        SELECT COUNT(*)::bigint
        FROM public.follows fc
        WHERE fc.following_id = p.id
      )
    ) AS user_data,
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'main_image_url', public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'address', b.address,
      'credited_entities', (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'name', COALESCE(pp.name, cc.name),
              'id', COALESCE(bc.person_id, bc.company_id)
            )
            ORDER BY COALESCE(pp.name, cc.name)
          ),
          '[]'::jsonb
        )
        FROM public.building_credits bc
        LEFT JOIN public.people pp ON bc.person_id = pp.id
        LEFT JOIN public.companies cc ON bc.company_id = cc.id
        WHERE bc.building_id = b.id
          AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
          AND COALESCE(pp.name, cc.name) IS NOT NULL
      ),
      'year_completed', b.year_completed,
      'city', b.city,
      'country', b.country,
      'slug', b.slug,
      'short_id', b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug', loc.city_slug
    ) AS building_data,
    (SELECT COUNT(*) FROM likes l WHERE l.interaction_id = ub.id) AS likes_count,
    (SELECT COUNT(*) FROM comments c WHERE c.interaction_id = ub.id) AS comments_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.interaction_id = ub.id AND l.user_id = v_user_id) AS is_liked,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'storage_path', ri.storage_path,
            'likes_count', ri.likes_count,
            'is_liked', EXISTS(SELECT 1 FROM image_likes il WHERE il.image_id = ri.id AND il.user_id = v_user_id)
          )
        )
        FROM review_images ri
        WHERE ri.review_id = ub.id
      ),
      '[]'::jsonb
    ) AS review_images
  FROM user_buildings ub
  LEFT JOIN profiles p ON ub.user_id = p.id
  LEFT JOIN buildings b ON ub.building_id = b.id
  LEFT JOIN localities loc ON b.locality_id = loc.id
  WHERE
    (ub.user_id IN (SELECT following_id FROM follows WHERE follower_id = v_user_id)
     OR ub.user_id = v_user_id)
    AND ub.status != 'ignored'
  ORDER BY COALESCE(ub.edited_at, ub.created_at) DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- -----------------------------------------------------------------------------
-- 2. get_suggested_posts — add locality fields to building_data JSON
-- -----------------------------------------------------------------------------

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
  is_suggested BOOLEAN,
  suggestion_reason TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH calculated_posts AS (
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
      (SELECT COUNT(*) FROM likes l WHERE l.interaction_id = ub.id) AS likes_count,
      (SELECT COUNT(*) FROM comments c WHERE c.interaction_id = ub.id) AS comments_count,
      EXISTS (SELECT 1 FROM likes l WHERE l.interaction_id = ub.id AND l.user_id = v_user_id) AS is_liked
    FROM user_buildings ub
    LEFT JOIN buildings b ON ub.building_id = b.id
    WHERE
      ub.user_id != v_user_id
      AND ub.user_id NOT IN (SELECT following_id FROM follows WHERE follower_id = v_user_id)
      AND ub.status NOT IN ('ignored', 'hidden')
      AND (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
  )
  SELECT
    cp.id,
    cp.content,
    cp.rating,
    cp.tags,
    cp.created_at,
    cp.edited_at,
    cp.status::TEXT,
    cp.user_id,
    cp.building_id,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified_architect', EXISTS (SELECT 1 FROM public.people pe WHERE pe.claimed_by_user_id = p.id AND pe.claim_status::text IN ('claimed', 'verified')),
      'is_architect_of_building', EXISTS (
        SELECT 1
        FROM public.building_credits bc
        WHERE bc.building_id = cp.building_id
          AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
          AND (
            bc.person_id IN (SELECT pe_sub.id FROM public.people pe_sub WHERE pe_sub.claimed_by_user_id = p.id)
            OR bc.company_id IN (SELECT cs.company_id FROM public.company_stewards cs WHERE cs.user_id = p.id)
          )
      ),
      'followers_count', (
        SELECT COUNT(*)::bigint
        FROM public.follows fc
        WHERE fc.following_id = p.id
      )
    ) AS user_data,
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'main_image_url', public.main_image_url(b),
      'community_preview_url', b.community_preview_url,
      'address', b.address,
      'credited_entities', (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'name', COALESCE(pp.name, cc.name),
              'id', COALESCE(bc.person_id, bc.company_id)
            )
            ORDER BY COALESCE(pp.name, cc.name)
          ),
          '[]'::jsonb
        )
        FROM public.building_credits bc
        LEFT JOIN public.people pp ON bc.person_id = pp.id
        LEFT JOIN public.companies cc ON bc.company_id = cc.id
        WHERE bc.building_id = b.id
          AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
          AND COALESCE(pp.name, cc.name) IS NOT NULL
      ),
      'year_completed', b.year_completed,
      'city', b.city,
      'country', b.country,
      'slug', b.slug,
      'short_id', b.short_id,
      'locality_country_code', loc.country_code,
      'locality_city_slug', loc.city_slug
    ) AS building_data,
    cp.likes_count,
    cp.comments_count,
    cp.is_liked,
    TRUE AS is_suggested,
    'Popular'::TEXT AS suggestion_reason
  FROM calculated_posts cp
  LEFT JOIN profiles p ON cp.user_id = p.id
  LEFT JOIN buildings b ON cp.building_id = b.id
  LEFT JOIN localities loc ON b.locality_id = loc.id
  ORDER BY
    ((COALESCE(cp.rating, 0) * 2) + cp.likes_count) DESC,
    cp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- -----------------------------------------------------------------------------
-- 3. get_building_leaderboards — add locality_country_code, locality_city_slug,
--    and short_id to both most_visited and top_rated result sets
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_building_leaderboards()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    most_visited JSON;
    top_rated JSON;
BEGIN
    -- Most Visited: Count of users who marked as visited
    SELECT json_agg(t) INTO most_visited
    FROM (
        SELECT
            b.id,
            b.short_id,
            b.name,
            b.city,
            b.country,
            b.main_image_url,
            b.slug,
            loc.country_code AS locality_country_code,
            loc.city_slug    AS locality_city_slug,
            COUNT(ub.id) as visit_count
        FROM buildings b
        JOIN user_buildings ub ON b.id = ub.building_id
        LEFT JOIN localities loc ON b.locality_id = loc.id
        WHERE ub.status = 'visited'
        GROUP BY b.id, loc.country_code, loc.city_slug
        ORDER BY visit_count DESC
        LIMIT 10
    ) t;

    -- Top Rated: Average rating, min 3 votes
    SELECT json_agg(t) INTO top_rated
    FROM (
        SELECT
            b.id,
            b.short_id,
            b.name,
            b.city,
            b.country,
            b.main_image_url,
            b.slug,
            loc.country_code AS locality_country_code,
            loc.city_slug    AS locality_city_slug,
            AVG(ub.rating)::numeric(10,1) as avg_rating,
            COUNT(ub.id) as rating_count
        FROM buildings b
        JOIN user_buildings ub ON b.id = ub.building_id
        LEFT JOIN localities loc ON b.locality_id = loc.id
        WHERE ub.rating IS NOT NULL
        GROUP BY b.id, loc.country_code, loc.city_slug
        HAVING COUNT(ub.id) >= 3
        ORDER BY avg_rating DESC, rating_count DESC
        LIMIT 10
    ) t;

    RETURN json_build_object(
        'most_visited', COALESCE(most_visited, '[]'::json),
        'top_rated', COALESCE(top_rated, '[]'::json)
    );
END;
$$;
