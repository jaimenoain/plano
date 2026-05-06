-- Fix find_nearby_buildings: migration 20260710 incorrectly referenced b.main_image_url
-- as a column, but that column was dropped in 20260701 and replaced with the computed
-- function main_image_url(b buildings). Use the computed function call instead.

DROP FUNCTION IF EXISTS find_nearby_buildings(double precision, double precision, double precision, text);

CREATE OR REPLACE FUNCTION find_nearby_buildings(
  lat double precision,
  long double precision,
  radius_meters double precision DEFAULT 100,
  name_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  short_id int,
  slug text,
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
    b.short_id,
    b.slug,
    b.name,
    b.address,
    st_y(b.location::geometry) as location_lat,
    st_x(b.location::geometry) as location_lng,
    st_distance(b.location, st_point(long, lat)::geography) as dist_meters,
    CASE
      WHEN name_query IS NOT NULL AND LENGTH(name_query) > 0 THEN similarity(b.name, name_query)::double precision
      ELSE 0.0::double precision
    END as similarity_score,
    main_image_url(b) as main_image_url
  FROM
    buildings b
  WHERE
    b.is_deleted = false
    AND (
      st_dwithin(b.location, st_point(long, lat)::geography, radius_meters)
      OR
      (
        st_dwithin(b.location, st_point(long, lat)::geography, 50000)
        AND
        name_query IS NOT NULL
        AND LENGTH(name_query) > 2
        AND (
          b.name ILIKE '%' || name_query || '%'
          OR
          similarity(b.name, name_query) > 0.3
        )
      )
    )
  ORDER BY
    (CASE WHEN name_query IS NOT NULL AND LENGTH(name_query) > 0 AND similarity(b.name, name_query) > 0.6 THEN 0 ELSE 1 END) ASC,
    dist_meters ASC,
    similarity_score DESC;
END;
$$;
