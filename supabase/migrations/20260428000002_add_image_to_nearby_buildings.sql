-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index on buildings name for faster similarity search
CREATE INDEX IF NOT EXISTS buildings_name_trgm_idx ON buildings USING gin (name gin_trgm_ops);

-- Drop existing function to allow signature change
-- We drop all variants to ensure we start fresh with the new signature
DROP FUNCTION IF EXISTS find_nearby_buildings(double precision, double precision, text, double precision);
DROP FUNCTION IF EXISTS find_nearby_buildings(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS find_nearby_buildings(double precision, double precision, double precision, text);

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
      WHEN name_query IS NOT NULL AND LENGTH(name_query) > 0 THEN similarity(b.name, name_query)
      ELSE 0.0
    END as similarity_score,
    b.main_image_url
  FROM
    buildings b
  WHERE
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
  ORDER BY
    -- Prioritize name similarity if it's a strong match, otherwise distance
    (CASE WHEN name_query IS NOT NULL AND LENGTH(name_query) > 0 AND similarity(b.name, name_query) > 0.6 THEN 0 ELSE 1 END) ASC,
    dist_meters ASC,
    similarity_score DESC;
END;
$$;
