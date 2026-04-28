-- get_discovery_feed referenced building_architects (removed in 20270837000000).
-- Filter p_architect_ids via building_credits (person_id / company_id), excluding hidden credits.

CREATE OR REPLACE FUNCTION get_discovery_feed(
  p_user_id uuid,
  p_limit int,
  p_offset int,
  p_city_filter text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_typology_ids uuid[] DEFAULT NULL,
  p_attribute_ids uuid[] DEFAULT NULL,
  p_architect_ids uuid[] DEFAULT NULL,
  p_country_filter text DEFAULT NULL,
  p_region_filter text DEFAULT NULL
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
    (p_city_filter IS NULL OR p_city_filter = '' OR b.city ILIKE p_city_filter)
    AND
    (p_country_filter IS NULL OR p_country_filter = '' OR b.country ILIKE p_country_filter)
    AND
    (p_region_filter IS NULL OR p_region_filter = '' OR b.address ILIKE '%' || p_region_filter || '%')
    AND
    NOT EXISTS (
      SELECT 1
      FROM user_buildings my_ub
      WHERE my_ub.building_id = b.id
      AND my_ub.user_id = p_user_id
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
    (p_architect_ids IS NULL OR cardinality(p_architect_ids) = 0 OR EXISTS (
      SELECT 1 FROM public.building_credits bc
      WHERE bc.building_id = b.id
        AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
        AND (
          (bc.person_id IS NOT NULL AND bc.person_id = ANY(p_architect_ids))
          OR (bc.company_id IS NOT NULL AND bc.company_id = ANY(p_architect_ids))
        )
    ))
  GROUP BY
    b.id
  HAVING
    (b.hero_image_url IS NOT NULL OR b.community_preview_url IS NOT NULL)
    OR
    BOOL_OR(ub.video_url IS NOT NULL)
  ORDER BY
    save_count DESC,
    b.id
  LIMIT
    p_limit
  OFFSET
    p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text) TO service_role;
