-- Fix return type mismatch in find_nearby_buildings and filter deleted buildings
-- The similarity() function returns real (float4), but RETURNS TABLE expected double precision (float8)

CREATE OR REPLACE FUNCTION find_nearby_buildings(
  lat double precision,
  long double precision,
  radius_meters double precision DEFAULT 100,
  name_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  location_lat double precision,
  location_lng double precision,
  dist_meters double precision,
  similarity_score double precision,
  main_image_url text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.address,
    st_y(b.location::geometry) as location_lat,
    st_x(b.location::geometry) as location_lng,
    st_distance(b.location, st_point(long, lat)::geography) as dist_meters,
    CASE
      WHEN name_query IS NOT NULL AND LENGTH(name_query) > 0 THEN similarity(b.name, name_query)::double precision
      ELSE 0.0::double precision
    END as similarity_score,
    b.main_image_url
  FROM
    buildings b
  WHERE
    b.is_deleted = false
    AND (
      -- 1. Tight radius check (unconditional)
      st_dwithin(b.location, st_point(long, lat)::geography, radius_meters)
      OR
      (
        -- 2. Expanded radius check for fuzzy name matching (50km)
        st_dwithin(b.location, st_point(long, lat)::geography, 50000)
        AND
        name_query IS NOT NULL
        AND LENGTH(name_query) > 2
        AND (
          -- Keep ILIKE for exact substring matches (implicit high similarity)
          b.name ILIKE '%' || name_query || '%'
          OR
          -- Fuzzy match
          similarity(b.name, name_query) > 0.3
        )
      )
    )
  ORDER BY
    -- Prioritize name similarity if it's a strong match, otherwise distance
    (CASE WHEN name_query IS NOT NULL AND LENGTH(name_query) > 0 AND similarity(b.name, name_query) > 0.6 THEN 0 ELSE 1 END) ASC,
    dist_meters ASC,
    similarity_score DESC;
END;
$$;
