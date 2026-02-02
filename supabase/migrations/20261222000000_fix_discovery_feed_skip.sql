-- Fix discovery feed to correctly calculate save counts and ensure skipped items are filtered
-- This migration updates get_discovery_feed to exclude 'ignored' status from save_count
-- and reinforces the filtering logic.

CREATE OR REPLACE FUNCTION get_discovery_feed(
  p_user_id uuid,
  p_limit int,
  p_offset int,
  p_city_filter text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_typology_ids uuid[] DEFAULT NULL,
  p_attribute_ids uuid[] DEFAULT NULL,
  p_architect_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
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
    b.name,
    b.address,
    b.city,
    b.country,
    b.year_completed,
    b.slug,
    main_image_url(b) as main_image_url,
    -- Only count actual saves/visits, not ignores
    count(CASE WHEN ub.status IN ('pending', 'visited') THEN 1 END) as save_count
  FROM
    buildings b
  LEFT JOIN
    user_buildings ub ON b.id = ub.building_id
  WHERE
    -- Filter by city if provided
    (p_city_filter IS NULL OR p_city_filter = '' OR b.city = p_city_filter)
    AND
    -- Exclude buildings already saved/ignored/visited by the user
    NOT EXISTS (
      SELECT 1
      FROM user_buildings my_ub
      WHERE my_ub.building_id = b.id
      AND my_ub.user_id = p_user_id
    )
    AND
    -- Exclude soft-deleted buildings
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND
    -- Filter by Category
    (p_category_id IS NULL OR b.functional_category_id = p_category_id)
    AND
    -- Filter by Typologies (ANY match)
    (p_typology_ids IS NULL OR cardinality(p_typology_ids) = 0 OR EXISTS (
      SELECT 1 FROM building_functional_typologies bft
      WHERE bft.building_id = b.id
      AND bft.typology_id = ANY(p_typology_ids)
    ))
    AND
    -- Filter by Attributes (ANY match)
    (p_attribute_ids IS NULL OR cardinality(p_attribute_ids) = 0 OR EXISTS (
      SELECT 1 FROM building_attributes ba
      WHERE ba.building_id = b.id
      AND ba.attribute_id = ANY(p_attribute_ids)
    ))
    AND
    -- Filter by Architects (ANY match)
    (p_architect_ids IS NULL OR cardinality(p_architect_ids) = 0 OR EXISTS (
      SELECT 1 FROM building_architects bar
      WHERE bar.building_id = b.id
      AND bar.architect_id = ANY(p_architect_ids)
    ))
  GROUP BY
    b.id
  HAVING
    (b.hero_image_url IS NOT NULL OR b.community_preview_url IS NOT NULL)
    OR
    BOOL_OR(ub.video_url IS NOT NULL)
  ORDER BY
    save_count DESC,
    b.id -- Deterministic tie-breaker for stability
  LIMIT
    p_limit
  OFFSET
    p_offset;
END;
$$;
