-- Building detail page calls PostgREST rpc/get_building_reviews.
-- Original definitions (20270701*) referenced building_architects; after Task 11.1 that
-- table is dropped — dependent functions must not block the DROP, and the RPC must
-- stay aligned with get_feed user_data (people + building_credits + company_stewards).
-- GRANT EXECUTE was never present on older migrations; without it PostgREST returns 404.

CREATE OR REPLACE FUNCTION public.get_building_reviews(p_building_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  rating INTEGER,
  status TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  video_url TEXT,
  user_data JSONB,
  images JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ub.id,
    ub.user_id,
    ub.content,
    ub.rating,
    ub.status::TEXT,
    ub.tags,
    ub.created_at,
    ub.video_url,
    jsonb_build_object(
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified_architect', EXISTS (
        SELECT 1
        FROM public.people pe
        WHERE pe.claimed_by_user_id = p.id
          AND pe.claim_status::text IN ('claimed', 'verified')
      ),
      'is_architect_of_building', EXISTS (
        SELECT 1
        FROM public.building_credits bc
        WHERE bc.building_id = ub.building_id
          AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
          AND (
            bc.person_id IN (
              SELECT pe_sub.id
              FROM public.people pe_sub
              WHERE pe_sub.claimed_by_user_id = p.id
            )
            OR bc.company_id IN (
              SELECT cs.company_id
              FROM public.company_stewards cs
              WHERE cs.user_id = p.id
            )
          )
      )
    ) AS user_data,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'storage_path', ri.storage_path,
            'likes_count', ri.likes_count,
            'created_at', ri.created_at,
            'is_generated', ri.is_generated,
            'is_official', ri.is_official
          )
        )
        FROM public.review_images ri
        WHERE ri.review_id = ub.id
      ),
      '[]'::jsonb
    ) AS images
  FROM public.user_buildings ub
  LEFT JOIN public.profiles p ON ub.user_id = p.id
  WHERE ub.building_id = p_building_id
  ORDER BY ub.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.get_building_reviews(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_building_reviews(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_building_reviews(UUID) TO service_role;
