-- Fix PostgREST 400 on `get_feed`: PL/pgSQL error 42702 "column reference \"id\" is ambiguous".
-- `RETURNS TABLE (id uuid, ...)` defines output variables; `SELECT id FROM public.people`
-- inside the `RETURN QUERY` was resolved against the output param, not `people.id`.
-- Qualify the subquery with a table alias (same logic as 20270839000000).

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
      'short_id', b.short_id
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
  WHERE
    (ub.user_id IN (SELECT following_id FROM follows WHERE follower_id = v_user_id)
     OR ub.user_id = v_user_id)
    AND ub.status != 'ignored'
  ORDER BY COALESCE(ub.edited_at, ub.created_at) DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
