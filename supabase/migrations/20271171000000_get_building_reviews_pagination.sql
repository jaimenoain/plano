-- Paginate get_building_reviews at the data layer.
--
-- Previously this RPC returned EVERY review (and every nested image) for a
-- building in a single unbounded call. The building detail page then rendered
-- and scored the whole set client-side. That grows linearly with a building's
-- popularity, so heavily-reviewed buildings shipped a large payload up front —
-- the root cause of the slow Media tab.
--
-- New optional params add keyset-free LIMIT/OFFSET paging plus a server-side
-- sort mode:
--   * p_sort = 'top'    → ORDER BY a composite score mirroring the client's
--                         stream scoring (official / architect / likes / content
--                         / multi-image / video), so page 1 is the best content.
--   * p_sort = 'recent' → ORDER BY created_at DESC (the previous behaviour).
--
-- Defaults preserve every existing caller: p_limit NULL means "no limit" and
-- p_sort defaults to 'recent', so callers that still invoke
-- get_building_reviews(p_building_id) get byte-for-byte the previous result set
-- and ordering (e.g. the map building drawer).

DROP FUNCTION IF EXISTS public.get_building_reviews(uuid);

CREATE OR REPLACE FUNCTION public.get_building_reviews(
  p_building_id UUID,
  p_limit       INT  DEFAULT NULL,
  p_offset      INT  DEFAULT 0,
  p_sort        TEXT DEFAULT 'recent'
)
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
  WITH base AS (
    SELECT
      bp.id,
      bp.user_id,
      bp.body                     AS content,
      ub.rating,
      ub.status::TEXT             AS status,
      bp.tags,
      bp.created_at,
      bp.video_url,
      arch.is_architect_of_building,
      COALESCE(agg.is_official, FALSE) AS is_official,
      COALESCE(agg.top_likes, 0)       AS top_likes,
      COALESCE(agg.image_count, 0)     AS image_count,
      jsonb_build_object(
        'username',               p.username,
        'avatar_url',             p.avatar_url,
        'is_verified_architect',  EXISTS (
          SELECT 1 FROM public.people pe
          WHERE pe.claimed_by_user_id = p.id
            AND pe.claim_status::text IN ('claimed', 'verified')
        ),
        'is_architect_of_building', arch.is_architect_of_building
      ) AS user_data,
      COALESCE(agg.images, '[]'::jsonb) AS images
    FROM public.building_posts bp
    LEFT JOIN public.user_buildings ub
      ON ub.user_id = bp.user_id AND ub.building_id = bp.building_id
    LEFT JOIN public.profiles p ON p.id = bp.user_id
    LEFT JOIN LATERAL (
      SELECT EXISTS (
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
      ) AS is_architect_of_building
    ) arch ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        bool_or(ri.is_official)  AS is_official,
        max(ri.likes_count)      AS top_likes,
        count(*)                 AS image_count,
        jsonb_agg(
          jsonb_build_object(
            'id',           ri.id,
            'storage_path', ri.storage_path,
            'likes_count',  ri.likes_count,
            'created_at',   ri.created_at,
            'is_generated', ri.is_generated,
            'is_official',  ri.is_official,
            'caption',      ri.caption
          )
          ORDER BY ri.likes_count DESC, ri.created_at DESC
        ) AS images
      FROM public.review_images ri
      WHERE ri.review_id = bp.id
    ) agg ON TRUE
    WHERE bp.building_id = p_building_id
      AND (
        bp.body       IS NOT NULL
        OR bp.tags    IS NOT NULL
        OR bp.video_url IS NOT NULL
        OR COALESCE(agg.image_count, 0) > 0
      )
  )
  SELECT
    base.id,
    base.user_id,
    base.content,
    base.rating,
    base.status,
    base.tags,
    base.created_at,
    base.video_url,
    base.user_data,
    base.images
  FROM base
  ORDER BY
    CASE
      WHEN p_sort = 'top' THEN (
          CASE WHEN base.is_official THEN 1000 ELSE 0 END
        + CASE WHEN base.is_architect_of_building THEN 800 ELSE 0 END
        + base.top_likes * 10
        + CASE WHEN base.content IS NOT NULL AND btrim(base.content) <> '' THEN 20 ELSE 0 END
        + CASE WHEN base.image_count > 1 THEN 15 ELSE 0 END
        + CASE WHEN base.video_url IS NOT NULL AND base.image_count = 0 THEN 10 ELSE 0 END
      )
      ELSE 0
    END DESC,
    base.created_at DESC,
    base.id DESC
  LIMIT p_limit
  OFFSET COALESCE(p_offset, 0);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
