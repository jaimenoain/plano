-- Fix "Limit Before Clustering" Bug in Search RPC
-- Migration ID: 20270327000000_fix_get_map_clusters_limit.sql

-- Drop the old function signature to avoid ambiguity
DROP FUNCTION IF EXISTS get_map_clusters(double precision, double precision, double precision, double precision, int, jsonb);

CREATE OR REPLACE FUNCTION get_map_clusters(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  zoom int,
  filters jsonb DEFAULT NULL,
  p_limit int DEFAULT NULL -- Limit applied AFTER clustering
)
RETURNS TABLE (
  id text,
  lat double precision,
  lng double precision,
  count int,
  is_cluster boolean,
  name text,
  slug text,
  image_url text,
  architect_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_grid_size double precision;
  v_cluster_horizon int := 16;

  -- Filter variables
  v_cities_filter text[];
  v_country_filter text;
  v_architect_ids uuid[];
  v_category_id uuid;
  v_typology_ids uuid[];
  v_attribute_ids uuid[];
  v_year int;
BEGIN
  -- Dynamic Grid Calculation
  -- Formula: ~85 degrees at zoom 0, halving every zoom level.
  v_grid_size := 85.0 / pow(2, zoom);

  -- Parse Filters
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

    -- Year
    IF filters ? 'year' AND filters->>'year' IS NOT NULL THEN
        BEGIN
            v_year := (filters->>'year')::int;
        EXCEPTION WHEN OTHERS THEN
            v_year := NULL;
        END;
    END IF;
  END IF;

  IF zoom < v_cluster_horizon THEN
    -- Branch 1: Clustering
    -- 1. Filter First (CTE)
    RETURN QUERY
    WITH filtered_buildings AS (
      SELECT
        b.id,
        b.location,
        b.name,
        b.slug,
        b.main_image_url
      FROM buildings b
      WHERE
        (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
        AND b.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
        AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
        AND (v_country_filter IS NULL OR b.country = v_country_filter)
        AND (
            v_architect_ids IS NULL
            OR cardinality(v_architect_ids) = 0
            OR EXISTS (
                SELECT 1
                FROM building_architects ba
                WHERE ba.building_id = b.id
                AND ba.architect_id = ANY(v_architect_ids)
            )
        )
        AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
        AND (
            v_typology_ids IS NULL
            OR cardinality(v_typology_ids) = 0
            OR EXISTS (
                SELECT 1
                FROM building_functional_typologies bft
                WHERE bft.building_id = b.id
                AND bft.typology_id = ANY(v_typology_ids)
            )
        )
        AND (
            v_attribute_ids IS NULL
            OR cardinality(v_attribute_ids) = 0
            OR EXISTS (
                SELECT 1
                FROM building_attributes batt
                WHERE batt.building_id = b.id
                AND batt.attribute_id = ANY(v_attribute_ids)
            )
        )
        AND (v_year IS NULL OR b.year_completed = v_year)
        -- CRITICAL: NO LIMIT HERE
    )
    -- 2. Cluster Second
    SELECT
      -- Generate a unique ID for the cluster based on grid coordinates
      md5(format('%s-%s', st_x(st_snaptogrid(fb.location::geometry, v_grid_size)), st_y(st_snaptogrid(fb.location::geometry, v_grid_size))))::text as id,
      st_y(st_centroid(st_collect(fb.location::geometry))) as lat,
      st_x(st_centroid(st_collect(fb.location::geometry))) as lng,
      count(*)::int as count,
      true as is_cluster,
      NULL::text as name,
      NULL::text as slug,
      NULL::text as image_url,
      NULL::text[] as architect_names
    FROM filtered_buildings fb
    GROUP BY
      st_snaptogrid(fb.location::geometry, v_grid_size)
    -- 3. Limit Last
    ORDER BY count DESC -- Deterministic ordering by size
    LIMIT p_limit;

  ELSE
    -- Branch 2: Individual Buildings (High Zoom)
    -- 1. Filter First (CTE not strictly necessary but cleaner)
    RETURN QUERY
    WITH filtered_buildings AS (
      SELECT
        b.id,
        b.location,
        b.name,
        b.slug,
        b.main_image_url
      FROM buildings b
      WHERE
        (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
        AND b.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
        AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
        AND (v_country_filter IS NULL OR b.country = v_country_filter)
        AND (
            v_architect_ids IS NULL
            OR cardinality(v_architect_ids) = 0
            OR EXISTS (
                SELECT 1
                FROM building_architects ba
                WHERE ba.building_id = b.id
                AND ba.architect_id = ANY(v_architect_ids)
            )
        )
        AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
        AND (
            v_typology_ids IS NULL
            OR cardinality(v_typology_ids) = 0
            OR EXISTS (
                SELECT 1
                FROM building_functional_typologies bft
                WHERE bft.building_id = b.id
                AND bft.typology_id = ANY(v_typology_ids)
            )
        )
        AND (
            v_attribute_ids IS NULL
            OR cardinality(v_attribute_ids) = 0
            OR EXISTS (
                SELECT 1
                FROM building_attributes batt
                WHERE batt.building_id = b.id
                AND batt.attribute_id = ANY(v_attribute_ids)
            )
        )
        AND (v_year IS NULL OR b.year_completed = v_year)
        -- CRITICAL: NO LIMIT HERE
    )
    -- 2. Select Individual Points (No Clustering)
    SELECT
      fb.id::text,
      st_y(fb.location::geometry) as lat,
      st_x(fb.location::geometry) as lng,
      1::int as count,
      false as is_cluster,
      fb.name,
      fb.slug,
      fb.main_image_url as image_url,
      (
        SELECT array_agg(a.name)
        FROM building_architects ba
        JOIN architects a ON ba.architect_id = a.id
        WHERE ba.building_id = fb.id
      ) as architect_names
    FROM filtered_buildings fb
    -- 3. Limit Last
    ORDER BY fb.name ASC -- Deterministic ordering
    LIMIT p_limit;
  END IF;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_map_clusters(double precision, double precision, double precision, double precision, int, jsonb, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_map_clusters(double precision, double precision, double precision, double precision, int, jsonb, int) TO anon;
GRANT EXECUTE ON FUNCTION get_map_clusters(double precision, double precision, double precision, double precision, int, jsonb, int) TO service_role;
