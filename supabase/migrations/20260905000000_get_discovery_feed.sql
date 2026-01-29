-- Create get_discovery_feed RPC for discovery mode
-- Logic: Sort by popularity (save count), exclude user's saved buildings, slight randomness.

CREATE OR REPLACE FUNCTION get_discovery_feed(
  p_user_id uuid,
  p_limit int,
  p_offset int,
  p_city_filter text DEFAULT NULL
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
    count(ub.id) as save_count
  FROM
    buildings b
  LEFT JOIN
    user_buildings ub ON b.id = ub.building_id
  WHERE
    -- Filter by city if provided
    (p_city_filter IS NULL OR b.city = p_city_filter)
    AND
    -- Exclude buildings already saved by the user
    NOT EXISTS (
      SELECT 1
      FROM user_buildings my_ub
      WHERE my_ub.building_id = b.id
      AND my_ub.user_id = p_user_id
    )
    AND
    -- Exclude soft-deleted buildings
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
  GROUP BY
    b.id
  ORDER BY
    save_count DESC,
    random() -- Slight randomness for similar popularity
  LIMIT
    p_limit
  OFFSET
    p_offset;
END;
$$;
