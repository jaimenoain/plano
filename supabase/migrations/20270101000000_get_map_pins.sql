-- Create get_map_pins RPC for lightweight map data
-- Migration ID: 20270101000000_get_map_pins.sql

CREATE OR REPLACE FUNCTION get_map_pins(
  query_text text DEFAULT NULL,
  location_coordinates jsonb DEFAULT NULL, -- {lat: number, lng: number}
  radius_meters int DEFAULT NULL,
  filters jsonb DEFAULT NULL, -- {cities: text[], country: text, category_id: uuid, typology_ids: uuid[], attribute_ids: uuid[], architects: uuid[]}
  p_limit int DEFAULT 50000,
  min_lat double precision DEFAULT NULL,
  max_lat double precision DEFAULT NULL,
  min_lng double precision DEFAULT NULL,
  max_lng double precision DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  location_lat double precision,
  location_lng double precision,
  name text,
  status text,
  is_candidate boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
  v_radius int := COALESCE(radius_meters, 20000000); -- Default to global (20,000 km)

  -- Filters
  v_cities_filter text[];
  v_country_filter text;
  v_architect_ids uuid[];
  v_category_id uuid;
  v_typology_ids uuid[];
  v_attribute_ids uuid[];
BEGIN
  -- 1. Parse Inputs

  -- Location
  IF location_coordinates IS NOT NULL AND location_coordinates ? 'lat' AND location_coordinates ? 'lng' THEN
    v_lat := (location_coordinates->>'lat')::double precision;
    v_lng := (location_coordinates->>'lng')::double precision;
  END IF;

  -- Filters
  IF filters IS NOT NULL THEN
    -- Cities
    IF filters ? 'cities' AND jsonb_typeof(filters->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'cities')) INTO v_cities_filter;
    END IF;

    -- Country
    v_country_filter := filters->>'country';

    -- Architects
    IF filters ? 'architects' AND jsonb_typeof(filters->'architects') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'architects')::uuid) INTO v_architect_ids;
        EXCEPTION WHEN OTHERS THEN
            v_architect_ids := NULL;
        END;
    END IF;

    -- Category
    IF filters ? 'category_id' AND filters->>'category_id' IS NOT NULL THEN
        BEGIN
            v_category_id := (filters->>'category_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_category_id := NULL;
        END;
    END IF;

    -- Typology
    IF filters ? 'typology_ids' AND jsonb_typeof(filters->'typology_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'typology_ids')::uuid) INTO v_typology_ids;
        EXCEPTION WHEN OTHERS THEN
            v_typology_ids := NULL;
        END;
    END IF;

    -- Attributes
    IF filters ? 'attribute_ids' AND jsonb_typeof(filters->'attribute_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'attribute_ids')::uuid) INTO v_attribute_ids;
        EXCEPTION WHEN OTHERS THEN
            v_attribute_ids := NULL;
        END;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    st_y(b.location::geometry) as location_lat,
    st_x(b.location::geometry) as location_lng,
    b.name,
    b.status::text as status,
    (NOT b.is_verified) as is_candidate
  FROM buildings b
  WHERE
    (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
    AND
    (v_country_filter IS NULL OR b.country = v_country_filter)
    AND
    (
        v_architect_ids IS NULL
        OR cardinality(v_architect_ids) = 0
        OR EXISTS (
            SELECT 1
            FROM building_architects ba
            WHERE ba.building_id = b.id
            AND ba.architect_id = ANY(v_architect_ids)
        )
    )
    AND
    (
        v_category_id IS NULL
        OR b.functional_category_id = v_category_id
    )
    AND
    (
        v_typology_ids IS NULL
        OR cardinality(v_typology_ids) = 0
        OR EXISTS (
            SELECT 1
            FROM building_functional_typologies bft
            WHERE bft.building_id = b.id
            AND bft.typology_id = ANY(v_typology_ids)
        )
    )
    AND
    (
        v_attribute_ids IS NULL
        OR cardinality(v_attribute_ids) = 0
        OR EXISTS (
            SELECT 1
            FROM building_attributes batt
            WHERE batt.building_id = b.id
            AND batt.attribute_id = ANY(v_attribute_ids)
        )
    )
    AND
    (
        (min_lat IS NOT NULL AND max_lat IS NOT NULL AND min_lng IS NOT NULL AND max_lng IS NOT NULL AND
         b.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography)
        OR
        (
            (min_lat IS NULL OR max_lat IS NULL OR min_lng IS NULL OR max_lng IS NULL) AND
            (v_lat IS NULL OR v_lng IS NULL OR st_dwithin(b.location, st_point(v_lng, v_lat)::geography, v_radius))
        )
    )
    AND
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND
    (
      query_text IS NULL OR query_text = '' OR
      b.name ILIKE '%' || query_text || '%' OR
      b.address ILIKE '%' || query_text || '%'
      OR EXISTS (
        SELECT 1
        FROM building_architects ba
        JOIN architects a ON ba.architect_id = a.id
        WHERE ba.building_id = b.id
        AND a.name ILIKE '%' || query_text || '%'
      )
      OR
      (LENGTH(query_text) > 2 AND similarity(b.name, query_text) > 0.3)
    )
  ORDER BY
    CASE WHEN v_lat IS NOT NULL THEN
      st_distance(b.location, st_point(v_lng, v_lat)::geography)
    END ASC NULLS LAST,
    b.name ASC
  LIMIT p_limit;
END;
$$;
