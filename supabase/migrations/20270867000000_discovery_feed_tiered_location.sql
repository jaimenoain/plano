-- Explore discovery feed: tiered location filter —
-- Apply after 20270862000000 / 20270866000000 if present; drops both 13- and 14-arg signatures.
--   1) p_locality_id → buildings.locality_id (catalog locality)
--   2) else valid viewport box → PostGIS intersection with buildings.location
--   3) else existing text filters (city / country / country_code / region substring)
--
-- Also exposes resolve_locality_for_explore(city, country_code) → locality id
-- so the client can match Google place names to catalog rows without duplicating slug logic.

CREATE OR REPLACE FUNCTION public.resolve_locality_for_explore(
  p_city text,
  p_country_code text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id
  FROM public.localities l
  WHERE upper(trim(l.country_code)) = upper(trim(p_country_code))
    AND l.slug = public.make_locality_slug(trim(p_city), trim(p_country_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_locality_for_explore(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_locality_for_explore(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_locality_for_explore(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_locality_for_explore(text, text) TO service_role;

COMMENT ON FUNCTION public.resolve_locality_for_explore(text, text) IS
  'Maps a Google-style city name + ISO country code to public.localities.id using make_locality_slug; returns NULL if no row.';

DROP FUNCTION IF EXISTS public.get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text, text[], uuid[], text[], text);
DROP FUNCTION IF EXISTS public.get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text, text[], uuid[], text[]);

CREATE OR REPLACE FUNCTION public.get_discovery_feed(
  p_user_id uuid,
  p_limit int,
  p_offset int,
  p_city_filter text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_typology_ids uuid[] DEFAULT NULL,
  p_attribute_ids uuid[] DEFAULT NULL,
  p_architect_ids uuid[] DEFAULT NULL,
  p_country_filter text DEFAULT NULL,
  p_region_filter text DEFAULT NULL,
  p_credit_roles text[] DEFAULT NULL,
  p_contact_user_ids uuid[] DEFAULT NULL,
  p_building_statuses text[] DEFAULT NULL,
  p_country_code_filter text DEFAULT NULL,
  p_locality_id uuid DEFAULT NULL,
  p_min_lat double precision DEFAULT NULL,
  p_max_lat double precision DEFAULT NULL,
  p_min_lng double precision DEFAULT NULL,
  p_max_lng double precision DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  short_id int,
  name text,
  address text,
  city text,
  country text,
  year_completed int,
  slug text,
  main_image_url text,
  save_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.short_id,
    b.name,
    b.address,
    b.city,
    b.country,
    b.year_completed,
    b.slug,
    main_image_url(b) as main_image_url,
    count(CASE WHEN ub.status IN ('pending', 'visited') THEN 1 END) as save_count
  FROM
    buildings b
  LEFT JOIN
    user_buildings ub ON b.id = ub.building_id
  WHERE
    CASE
      WHEN p_locality_id IS NOT NULL THEN
        b.locality_id = p_locality_id
      WHEN (
        p_min_lat IS NOT NULL
        AND p_max_lat IS NOT NULL
        AND p_min_lng IS NOT NULL
        AND p_max_lng IS NOT NULL
        AND p_min_lat <= p_max_lat
        AND (p_max_lng - p_min_lng) > 1e-7
        AND (p_max_lng - p_min_lng) <= 179.0
        AND (p_max_lat - p_min_lat) > 1e-7
        AND (p_max_lat - p_min_lat) <= 25.0
        AND (p_max_lng - p_min_lng) <= 25.0
      ) THEN (
        b.location IS NOT NULL
        AND (
          (
            (p_max_lng - p_min_lng) > 179
            AND b.location::geometry && st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
          )
          OR (
            (p_max_lng - p_min_lng) <= 179
            AND b.location && st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geography
          )
        )
      )
      ELSE (
        (
          p_city_filter IS NULL OR trim(p_city_filter) = '' OR (
            strpos(lower(coalesce(b.city, '')), lower(trim(p_city_filter))) > 0
            OR strpos(lower(coalesce(b.address, '')), lower(trim(p_city_filter))) > 0
          )
        )
        AND (
          (coalesce(trim(p_country_code_filter), '') = '' AND coalesce(trim(p_country_filter), '') = '')
          OR (
            coalesce(trim(p_country_code_filter), '') <> ''
            AND (
              (b.country_code IS NOT NULL AND upper(b.country_code) = upper(trim(p_country_code_filter)))
              OR (
                b.country_code IS NULL
                AND coalesce(trim(p_country_filter), '') <> ''
                AND strpos(lower(coalesce(b.country, '')), lower(trim(p_country_filter))) > 0
              )
            )
          )
          OR (
            coalesce(trim(p_country_code_filter), '') = ''
            AND coalesce(trim(p_country_filter), '') <> ''
            AND strpos(lower(coalesce(b.country, '')), lower(trim(p_country_filter))) > 0
          )
        )
        AND (
          p_region_filter IS NULL OR trim(p_region_filter) = ''
          OR strpos(lower(coalesce(b.address, '')), lower(trim(p_region_filter))) > 0
          OR strpos(lower(coalesce(b.city, '')), lower(trim(p_region_filter))) > 0
        )
      )
    END
    AND
    (
      (p_contact_user_ids IS NOT NULL AND cardinality(p_contact_user_ids) > 0)
      OR NOT EXISTS (
        SELECT 1
        FROM user_buildings my_ub
        WHERE my_ub.building_id = b.id
        AND my_ub.user_id = p_user_id
      )
    )
    AND
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND
    (p_category_id IS NULL OR b.functional_category_id = p_category_id)
    AND
    (p_typology_ids IS NULL OR cardinality(p_typology_ids) = 0 OR EXISTS (
      SELECT 1 FROM building_functional_typologies bft
      WHERE bft.building_id = b.id
      AND bft.typology_id = ANY(p_typology_ids)
    ))
    AND
    (p_attribute_ids IS NULL OR cardinality(p_attribute_ids) = 0 OR EXISTS (
      SELECT 1 FROM building_attributes ba
      WHERE ba.building_id = b.id
      AND ba.attribute_id = ANY(p_attribute_ids)
    ))
    AND
    (
      (
        (p_architect_ids IS NULL OR cardinality(p_architect_ids) = 0)
        AND (p_credit_roles IS NULL OR cardinality(p_credit_roles) = 0)
      )
      OR EXISTS (
        SELECT 1 FROM public.building_credits bc
        WHERE bc.building_id = b.id
          AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
          AND (
            (p_architect_ids IS NULL OR cardinality(p_architect_ids) = 0)
            OR (bc.person_id IS NOT NULL AND bc.person_id = ANY(p_architect_ids))
            OR (bc.company_id IS NOT NULL AND bc.company_id = ANY(p_architect_ids))
          )
          AND (
            (p_credit_roles IS NULL OR cardinality(p_credit_roles) = 0)
            OR bc.role::text = ANY(p_credit_roles)
          )
      )
    )
    AND
    (
      p_contact_user_ids IS NULL OR cardinality(p_contact_user_ids) = 0
      OR EXISTS (
        SELECT 1 FROM user_buildings cub
        WHERE cub.building_id = b.id
          AND cub.user_id = ANY(p_contact_user_ids)
          AND cub.status IS DISTINCT FROM 'ignored'
          AND (
            cub.status IN ('visited', 'pending')
            OR cub.rating IS NOT NULL
          )
      )
    )
    AND
    (
      p_building_statuses IS NULL OR cardinality(p_building_statuses) = 0
      OR (b.status IS NOT NULL AND b.status::text = ANY(p_building_statuses))
    )
  GROUP BY
    b.id
  HAVING
    (
      (p_contact_user_ids IS NOT NULL AND cardinality(p_contact_user_ids) > 0)
    )
    OR (b.hero_image_url IS NOT NULL OR b.community_preview_url IS NOT NULL)
    OR BOOL_OR(ub.video_url IS NOT NULL)
  ORDER BY
    save_count DESC,
    b.id
  LIMIT
    p_limit
  OFFSET
    p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text, text[], uuid[], text[], text, uuid, float8, float8, float8, float8) TO anon;
GRANT EXECUTE ON FUNCTION public.get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text, text[], uuid[], text[], text, uuid, float8, float8, float8, float8) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text, text[], uuid[], text[], text, uuid, float8, float8, float8, float8) TO service_role;
