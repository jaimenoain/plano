-- Create a function to find nearby buildings
CREATE OR REPLACE FUNCTION find_nearby_buildings(
  lat double precision,
  long double precision,
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
    st_dwithin(b.location, st_point(long, lat)::geography, radius_meters)
  ORDER BY
    dist_meters ASC;
END;
$$;
