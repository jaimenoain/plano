-- Recreate find_nearby_buildings to ensure it supports name search
-- Drops existing function signatures to avoid ambiguity

DROP FUNCTION IF EXISTS find_nearby_buildings(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS find_nearby_buildings(double precision, double precision, text, double precision);

CREATE OR REPLACE FUNCTION find_nearby_buildings(
  lat double precision,
  long double precision,
  name_query text DEFAULT NULL,
  radius_meters double precision DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  location_lat double precision,
  location_lng double precision,
  dist_meters double precision
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
    st_distance(b.location, st_point(long, lat)::geography) as dist_meters
  FROM
    buildings b
  WHERE
    -- Check for location match
    st_dwithin(b.location, st_point(long, lat)::geography, radius_meters)
    OR
    -- Check for name match (fuzzy/ilike) if name_query is provided and long enough
    (name_query IS NOT NULL AND LENGTH(name_query) > 2 AND b.name ILIKE '%' || name_query || '%')
  ORDER BY
    -- Prioritize location matches, then name matches
    dist_meters ASC;
END;
$$;
