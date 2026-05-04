-- Update get_building_reviews to include caption in the images JSONB.
CREATE OR REPLACE FUNCTION public.get_building_reviews(p_building_id UUID)
RETURNS TABLE (
  id          UUID,
  user_id     UUID,
  content     TEXT,
  rating      INTEGER,
  status      TEXT,
  tags        TEXT[],
  created_at  TIMESTAMPTZ,
  video_url   TEXT,
  user_data   JSONB,
  images      JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.user_id,
    bp.body                     AS content,
    ub.rating,
    ub.status::TEXT,
    bp.tags,
    bp.created_at,
    bp.video_url,
    jsonb_build_object(
      'username',               p.username,
      'avatar_url',             p.avatar_url,
      'is_verified_architect',  EXISTS (
        SELECT 1 FROM public.people pe
        WHERE pe.claimed_by_user_id = p.id
          AND pe.claim_status::text IN ('claimed', 'verified')
      ),
      'is_architect_of_building', EXISTS (
        SELECT 1 FROM public.building_credits bc
        WHERE bc.building_id = bp.building_id
          AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
          AND (
            bc.person_id IN (
              SELECT pe_sub.id FROM public.people pe_sub
              WHERE pe_sub.claimed_by_user_id = p.id
            )
            OR bc.company_id IN (
              SELECT cs.company_id FROM public.company_stewards cs
              WHERE cs.user_id = p.id
            )
          )
      )
    ) AS user_data,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',           ri.id,
            'storage_path', ri.storage_path,
            'likes_count',  ri.likes_count,
            'created_at',   ri.created_at,
            'is_generated', ri.is_generated,
            'is_official',  ri.is_official,
            'caption',      ri.caption
          )
        )
        FROM public.review_images ri
        WHERE ri.review_id = bp.id
      ),
      '[]'::jsonb
    ) AS images
  FROM public.building_posts bp
  LEFT JOIN public.user_buildings ub
    ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
  LEFT JOIN public.profiles p ON p.id = bp.user_id
  WHERE bp.building_id = p_building_id
    AND (
      bp.body       IS NOT NULL
      OR bp.tags    IS NOT NULL
      OR bp.video_url IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.review_images ri WHERE ri.review_id = bp.id)
    )
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
