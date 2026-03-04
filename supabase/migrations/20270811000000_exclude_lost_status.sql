-- Add 'Lost' to building_status enum
-- Update discovery RPCs to exclude 'Lost' building status

CREATE OR REPLACE FUNCTION get_map_clusters(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  zoom int,
  filters jsonb DEFAULT NULL,
  row_limit int DEFAULT 150000
)
RETURNS TABLE (
  id text,
  lat double precision,
  lng double precision,
  count bigint,
  is_cluster boolean,
  name text,
  slug text,
  image_url text,
  architect_names text[],
  popularity_score int,
  tier_rank text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_grid_size double precision;
  v_safe_min_lat double precision;
  v_safe_max_lat double precision;
  v_safe_min_lng double precision;
  v_safe_max_lng double precision;
  v_radius double precision;
  v_lat double precision;
  v_lng double precision;

  -- Filter variables
  v_query text;
  v_cities_filter text[];
  v_country_filter text;
  v_architect_ids uuid[];
  v_category_id uuid;
  v_typology_ids uuid[];
  v_attribute_ids uuid[];
  v_year int;
  v_access_levels text[];
  v_access_logistics text[];
  v_access_costs text[];
  v_construction_statuses text[];
BEGIN
  -- Dynamic Grid Calculation
  -- Formula: ~85 degrees at zoom 0, halving every zoom level.
  v_grid_size := 85.0 / pow(2, zoom);

  -- Parse Filters
  IF filters IS NOT NULL THEN
    -- Query Text Fallback
    IF filters ? 'query' AND filters->>'query' IS NOT NULL THEN
      v_query := filters->>'query';
    END IF;

    -- Cities
    IF filters ? 'cities' AND jsonb_typeof(filters->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'cities')) INTO v_cities_filter;
    END IF;

    -- Country
    IF filters ? 'country' AND filters->>'country' IS NOT NULL THEN
      v_country_filter := filters->>'country';
    END IF;

    -- Architects
    IF filters ? 'architect_ids' AND jsonb_typeof(filters->'architect_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'architect_ids')::uuid) INTO v_architect_ids;
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


    -- Access Filters
    IF filters ? 'access_levels' AND jsonb_typeof(filters->'access_levels') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'access_levels')) INTO v_access_levels;
    END IF;
    IF filters ? 'access_logistics' AND jsonb_typeof(filters->'access_logistics') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'access_logistics')) INTO v_access_logistics;
    END IF;
    IF filters ? 'access_costs' AND jsonb_typeof(filters->'access_costs') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'access_costs')) INTO v_access_costs;
    END IF;

    -- Construction Status Filter
    IF filters ? 'construction_statuses' AND jsonb_typeof(filters->'construction_statuses') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'construction_statuses')) INTO v_construction_statuses;
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

    -- Point / Radius mapping (if present)
    IF filters ? 'lat' AND filters->>'lat' IS NOT NULL THEN
      BEGIN
        v_lat := (filters->>'lat')::double precision;
      EXCEPTION WHEN OTHERS THEN v_lat := NULL; END;
    END IF;
    IF filters ? 'lng' AND filters->>'lng' IS NOT NULL THEN
      BEGIN
        v_lng := (filters->>'lng')::double precision;
      EXCEPTION WHEN OTHERS THEN v_lng := NULL; END;
    END IF;
    IF filters ? 'radius' AND filters->>'radius' IS NOT NULL THEN
      BEGIN
        v_radius := (filters->>'radius')::double precision;
      EXCEPTION WHEN OTHERS THEN v_radius := NULL; END;
    END IF;

  END IF;

  -- Ensure bounding box logic is safe
  v_safe_min_lat := min_lat;
  v_safe_max_lat := max_lat;
  v_safe_min_lng := min_lng;
  v_safe_max_lng := max_lng;

  IF v_safe_min_lat > v_safe_max_lat THEN
    v_safe_min_lat := max_lat;
    v_safe_max_lat := min_lat;
  END IF;

  RETURN QUERY
  WITH building_architects_agg AS (
      SELECT
          ba.building_id,
          array_agg(a.name) as architects_names
      FROM building_architects ba
      JOIN architects a ON ba.architect_id = a.id
      GROUP BY ba.building_id
  ),
  filtered_buildings AS (
    SELECT
      b.id,
      b.location,
      b.name,
      b.slug,
      b.popularity_score,
      b.tier_rank::text as tier_rank,
      main_image_url(b) as image_url,
      ba_agg.architects_names as architect_names
    FROM buildings b
    LEFT JOIN building_architects_agg ba_agg ON b.id = ba_agg.building_id
    WHERE
    (
      -- Standard geographic check when point/radius is missing
      (v_lat IS NULL AND v_lng IS NULL AND v_radius IS NULL) AND
      (
        (
          (max_lng - min_lng) > 179
          AND b.location::geometry && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)
        )
        OR
        (
          (max_lng - min_lng) <= 179
          AND b.location && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)::geography
        )
      )
    )
    OR
    (
      v_lat IS NULL OR v_lng IS NULL OR
      st_dwithin(b.location, st_point(v_lng, v_lat)::geography, v_radius)
    )
    AND
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
  AND (b.status::text IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost' AND b.status::text IS DISTINCT FROM 'Unbuilt')
    AND
    (v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level::text = ANY(v_access_levels))
    AND
    (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics::text = ANY(v_access_logistics))
    AND
    (v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost::text = ANY(v_access_costs))
    AND
    (
      (
        (v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0)
        AND (b.status::text IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost' AND b.status::text IS DISTINCT FROM 'Under Construction' AND b.status::text IS DISTINCT FROM 'Unbuilt')
      )
      OR b.status::text = ANY(v_construction_statuses)
    )
    AND
    (
      v_query IS NULL OR v_query = '' OR
      b.name ILIKE '%' || v_query || '%' OR
      b.alt_name ILIKE '%' || v_query || '%' OR
      b.address ILIKE '%' || v_query || '%' OR
      array_to_string(ba_agg.architects_names, ' ') ILIKE '%' || v_query || '%' OR
      EXISTS (
        SELECT 1
        FROM unnest(b.aliases) AS a(alias)
        WHERE alias ILIKE '%' || v_query || '%'
      )
    )
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
    LIMIT row_limit
  )
  SELECT
    CASE WHEN count(*) > 1 THEN
      md5(format('%s-%s', st_x(st_snaptogrid(fb.location::geometry, v_grid_size)), st_y(st_snaptogrid(fb.location::geometry, v_grid_size))))::text
    ELSE
      max(fb.id::text)
    END as id,
    st_y(st_centroid(st_collect(fb.location::geometry))) as lat,
    st_x(st_centroid(st_collect(fb.location::geometry))) as lng,
    count(*) as count,
    count(*) > 1 as is_cluster,
    CASE WHEN count(*) = 1 THEN max(fb.name) ELSE NULL END as name,
    CASE WHEN count(*) = 1 THEN max(fb.slug) ELSE NULL END as slug,
    CASE WHEN count(*) = 1 THEN max(fb.image_url) ELSE NULL END as image_url,
    CASE WHEN count(*) = 1 THEN max(fb.architect_names) ELSE NULL END as architect_names,
    CASE WHEN count(*) = 1 THEN max(fb.popularity_score) ELSE NULL END as popularity_score,
    CASE WHEN count(*) = 1 THEN max(fb.tier_rank) ELSE NULL END as tier_rank
  FROM filtered_buildings fb
  GROUP BY
    st_snaptogrid(fb.location::geometry, v_grid_size);
END;
$$;


GRANT EXECUTE ON FUNCTION get_map_clusters(double precision, double precision, double precision, double precision, int, jsonb, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_map_clusters(double precision, double precision, double precision, double precision, int, jsonb, int) TO anon;
GRANT EXECUTE ON FUNCTION get_map_clusters(double precision, double precision, double precision, double precision, int, jsonb, int) TO service_role;


-- 1. Update get_map_clusters_v2 to include alt_name and aliases in search
DROP FUNCTION IF EXISTS get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb);
CREATE OR REPLACE FUNCTION get_map_clusters_v2(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  zoom_level double precision,
  filter_criteria jsonb DEFAULT NULL
)
RETURNS TABLE (
  id text,
  lat double precision,
  lng double precision,
  count bigint,
  is_cluster boolean,
  status text,
  name text,
  slug text,
  image_url text,
  popularity_score int,
  tier_rank text,
  max_tier int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_grid_size double precision;
  v_safe_min_lat double precision;
  v_safe_max_lat double precision;
  v_safe_min_lng double precision;
  v_safe_max_lng double precision;
  v_lat_span double precision;
  v_lng_span double precision;

  -- Filter variables
  v_query text;
  v_cities_filter text[];
  v_country_filter text;
  v_architect_ids uuid[];
  v_category_id uuid;
  v_typology_ids uuid[];
  v_attribute_ids uuid[];
  v_year int;
  v_access_levels text[];
  v_access_logistics text[];
  v_access_costs text[];
  v_construction_statuses text[];
  v_status_filter text[];
  v_min_rating int; -- Community Rating (Tier)
  v_personal_min_rating int; -- Personal Rating
  v_hide_saved boolean;
  v_hide_visited boolean;
  v_ranking_preference text;

BEGIN
  -- 1. Calculate Grid Size
  v_grid_size := 85.0 / pow(2, zoom_level);

  IF zoom_level >= 13 THEN
    v_grid_size := v_grid_size / 6.0;
  ELSIF zoom_level >= 11 THEN
    v_grid_size := v_grid_size / 3.0;
  END IF;

  -- 2. Calculate Safe Bounds
  v_lat_span := max_lat - min_lat;
  v_lng_span := max_lng - min_lng;

  v_safe_min_lat := min_lat - (v_lat_span * 0.1);
  v_safe_max_lat := max_lat + (v_lat_span * 0.1);
  v_safe_min_lng := min_lng - (v_lng_span * 0.1);
  v_safe_max_lng := max_lng + (v_lng_span * 0.1);

  v_safe_min_lat := GREATEST(-90.0, v_safe_min_lat);
  v_safe_max_lat := LEAST(90.0, v_safe_max_lat);
  v_safe_min_lng := GREATEST(-180.0, v_safe_min_lng);
  v_safe_max_lng := LEAST(180.0, v_safe_max_lng);

  IF v_safe_min_lat > v_safe_max_lat THEN
    v_safe_min_lat := max_lat;
    v_safe_max_lat := min_lat;
  END IF;

  -- 3. Parse Filters
  IF filter_criteria IS NOT NULL THEN

    -- Query String Fallback
    IF filter_criteria ? 'query' AND filter_criteria->>'query' IS NOT NULL THEN
      v_query := filter_criteria->>'query';
    END IF;

    -- Cities
    IF filter_criteria ? 'cities' AND jsonb_typeof(filter_criteria->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'cities')) INTO v_cities_filter;
    END IF;

    -- Country
    IF filter_criteria ? 'country' AND filter_criteria->>'country' IS NOT NULL THEN
      v_country_filter := filter_criteria->>'country';
    END IF;

    -- Architects
    IF filter_criteria ? 'architect_ids' AND jsonb_typeof(filter_criteria->'architect_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'architect_ids')::uuid) INTO v_architect_ids;
        EXCEPTION WHEN OTHERS THEN
            v_architect_ids := NULL;
        END;
    END IF;

    -- Category
    IF filter_criteria ? 'category_id' AND filter_criteria->>'category_id' IS NOT NULL THEN
        BEGIN
            v_category_id := (filter_criteria->>'category_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_category_id := NULL;
        END;
    END IF;

    -- Typology
    IF filter_criteria ? 'typology_ids' AND jsonb_typeof(filter_criteria->'typology_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'typology_ids')::uuid) INTO v_typology_ids;
        EXCEPTION WHEN OTHERS THEN
            v_typology_ids := NULL;
        END;
    END IF;

    -- Attributes
    IF filter_criteria ? 'attribute_ids' AND jsonb_typeof(filter_criteria->'attribute_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'attribute_ids')::uuid) INTO v_attribute_ids;
        EXCEPTION WHEN OTHERS THEN
            v_attribute_ids := NULL;
        END;
    END IF;

    -- Access Filters
    IF filter_criteria ? 'access_levels' AND jsonb_typeof(filter_criteria->'access_levels') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'access_levels')) INTO v_access_levels;
    END IF;
    IF filter_criteria ? 'access_logistics' AND jsonb_typeof(filter_criteria->'access_logistics') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'access_logistics')) INTO v_access_logistics;
    END IF;
    IF filter_criteria ? 'access_costs' AND jsonb_typeof(filter_criteria->'access_costs') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'access_costs')) INTO v_access_costs;
    END IF;

    -- Construction Status Filter
    IF filter_criteria ? 'construction_statuses' AND jsonb_typeof(filter_criteria->'construction_statuses') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'construction_statuses')) INTO v_construction_statuses;
    END IF;

    -- Year
    IF filter_criteria ? 'year' AND filter_criteria->>'year' IS NOT NULL THEN
        BEGIN
            v_year := (filter_criteria->>'year')::int;
        EXCEPTION WHEN OTHERS THEN
            v_year := NULL;
        END;
    END IF;

    -- Status
    IF filter_criteria ? 'status' AND jsonb_typeof(filter_criteria->'status') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'status')) INTO v_status_filter;
    END IF;

    -- Min Rating
    IF filter_criteria ? 'min_rating' AND filter_criteria->>'min_rating' IS NOT NULL THEN
        BEGIN
            v_min_rating := (filter_criteria->>'min_rating')::int;
        EXCEPTION WHEN OTHERS THEN
            v_min_rating := 0;
        END;
    ELSE
        v_min_rating := 0;
    END IF;

    -- Personal Min Rating
    IF filter_criteria ? 'personal_min_rating' AND filter_criteria->>'personal_min_rating' IS NOT NULL THEN
        BEGIN
            v_personal_min_rating := (filter_criteria->>'personal_min_rating')::int;
        EXCEPTION WHEN OTHERS THEN
            v_personal_min_rating := 0;
        END;
    ELSE
        v_personal_min_rating := 0;
    END IF;

    -- Hide Saved
    IF filter_criteria ? 'hide_saved' THEN
        v_hide_saved := (filter_criteria->>'hide_saved')::boolean;
    ELSE
        v_hide_saved := false;
    END IF;

    -- Hide Visited
    IF filter_criteria ? 'hide_visited' THEN
        v_hide_visited := (filter_criteria->>'hide_visited')::boolean;
    ELSE
        v_hide_visited := false;
    END IF;

    -- Ranking Preference
    IF filter_criteria ? 'ranking_preference' THEN
        v_ranking_preference := filter_criteria->>'ranking_preference';
    ELSE
        v_ranking_preference := 'global';
    END IF;

  ELSE
    v_min_rating := 0;
    v_personal_min_rating := 0;
    v_hide_saved := false;
    v_hide_visited := false;
    v_ranking_preference := 'global';
  END IF;

  RETURN QUERY
  WITH filtered_buildings AS (
    SELECT
      b.id,
      b.location,
      b.name,
      b.slug,
      main_image_url(b) as image_url,
      b.popularity_score,
      b.tier_rank,
      CASE
        WHEN ub.status::text = 'visited' THEN 'visited'
        WHEN ub.status::text = 'pending' THEN 'saved'
        ELSE 'none'
      END as mapped_status,
      COALESCE(ub.rating, 0) as mapped_rating
    FROM buildings b
    LEFT JOIN user_buildings ub ON b.id = ub.building_id AND ub.user_id = auth.uid()
    WHERE
      (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
      AND b.location IS NOT NULL
      AND (
        (
          (v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0)
          AND (b.status::text IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost' AND b.status::text IS DISTINCT FROM 'Under Construction' AND b.status::text IS DISTINCT FROM 'Unbuilt')
        )
        OR b.status::text = ANY(v_construction_statuses)
      )
      AND (COALESCE(b.popularity_score, 0) >= -50)
      AND (ub.status::text IS DISTINCT FROM 'ignored')
      AND (
          (
            (v_safe_max_lng - v_safe_min_lng) > 179
            AND
            b.location::geometry && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)
          )
          OR
          (
            (v_safe_max_lng - v_safe_min_lng) <= 179
            AND
            b.location && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)::geography
          )
      )
      -- Standard Filters
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
      AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level::text = ANY(v_access_levels))
      AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics::text = ANY(v_access_logistics))
      AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost::text = ANY(v_access_costs))

      -- Query / Text Search
      AND (
        v_query IS NULL OR v_query = '' OR
        b.name ILIKE '%' || v_query || '%' OR
        b.alt_name ILIKE '%' || v_query || '%' OR
        b.address ILIKE '%' || v_query || '%' OR
        EXISTS (
          SELECT 1 FROM building_architects ba
          JOIN architects a ON ba.architect_id = a.id
          WHERE ba.building_id = b.id AND a.name ILIKE '%' || v_query || '%'
        )
        OR
        EXISTS (
            SELECT 1
            FROM unnest(b.aliases) AS a(alias)
            WHERE alias ILIKE '%' || v_query || '%'
        )
        OR
        (LENGTH(v_query) > 2 AND similarity(b.name, v_query) > 0.3)
      )
      -- User Status Filter
      AND (
        v_status_filter IS NULL OR cardinality(v_status_filter) = 0 OR
        (
          ('visited' = ANY(v_status_filter) AND ub.status::text = 'visited') OR
          ('saved' = ANY(v_status_filter) AND ub.status::text = 'pending') OR
          ('none' = ANY(v_status_filter) AND (ub.status IS NULL OR ub.status::text = 'ignored'))
        )
      )
      -- Hide Saved / Visited
      AND (v_hide_saved IS FALSE OR ub.status::text IS DISTINCT FROM 'pending')
      AND (v_hide_visited IS FALSE OR ub.status::text IS DISTINCT FROM 'visited')

      -- Personal Rating
      AND (
        v_personal_min_rating = 0 OR
        COALESCE(ub.rating, 0) >= v_personal_min_rating
      )

      -- Community Rating (Tier)
      AND (
        v_min_rating = 0 OR
        (v_min_rating = 1 AND b.tier_rank::text IN ('Top 20%', 'Top 10%', 'Top 5%', 'Top 1%')) OR
        (v_min_rating = 2 AND b.tier_rank::text IN ('Top 5%', 'Top 1%')) OR
        (v_min_rating = 3 AND b.tier_rank::text = 'Top 1%')
      )
  )
  SELECT
    CASE WHEN count(*) > 1 THEN
      md5(format('%s-%s', st_x(st_snaptogrid(fb.location::geometry, v_grid_size)), st_y(st_snaptogrid(fb.location::geometry, v_grid_size))))::text
    ELSE
      max(fb.id::text)
    END as id,
    st_y(st_centroid(st_collect(fb.location::geometry))) as lat,
    st_x(st_centroid(st_collect(fb.location::geometry))) as lng,
    count(*) as count,
    count(*) > 1 as is_cluster,
    CASE WHEN count(*) = 1 THEN max(fb.mapped_status) ELSE NULL END as status,
    CASE WHEN count(*) = 1 THEN max(fb.name) ELSE NULL END as name,
    CASE WHEN count(*) = 1 THEN max(fb.slug) ELSE NULL END as slug,
    CASE WHEN count(*) = 1 THEN max(fb.image_url) ELSE NULL END as image_url,
    CASE WHEN count(*) = 1 THEN max(fb.popularity_score) ELSE NULL END as popularity_score,
    CASE WHEN count(*) = 1 THEN max(fb.tier_rank)::text ELSE NULL END as tier_rank,
    CASE
      WHEN count(*) > 1 THEN
        MAX(
          CASE
             WHEN v_ranking_preference = 'personal' THEN
                 CASE
                    WHEN fb.mapped_rating >= 3 THEN 3
                    WHEN fb.mapped_rating = 2 THEN 2
                    ELSE 1
                 END
             ELSE
                 GREATEST(
                    CASE
                      WHEN fb.mapped_rating >= 3 THEN 3
                      WHEN fb.mapped_rating = 2 THEN 2
                      ELSE 1
                    END,
                    CASE
                      WHEN fb.tier_rank::text = 'Top 1%' THEN 4
                      WHEN fb.tier_rank::text IN ('Top 5%', 'Top 10%') THEN 3
                      WHEN fb.tier_rank::text = 'Top 20%' THEN 2
                      ELSE 1
                    END
                 )
          END
        )::int
      ELSE NULL
    END as max_tier
  FROM filtered_buildings fb
  GROUP BY
    st_snaptogrid(fb.location::geometry, v_grid_size);
END;
$$;


GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO service_role;
CREATE OR REPLACE FUNCTION search_buildings(
  query_text text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  radius_meters int DEFAULT NULL,
  filters jsonb DEFAULT NULL, -- {cities: text[], country: text, category_id: uuid, typology_ids: uuid[], attribute_ids: uuid[], architect_ids: uuid[]}
  sort_by text DEFAULT 'relevance', -- 'distance' or 'relevance'
  p_access_levels text[] DEFAULT NULL,
  p_access_logistics text[] DEFAULT NULL,
  p_access_costs text[] DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  location_lat double precision,
  location_lng double precision,
  city text,
  country text,
  styles jsonb,
  architects jsonb,
  year_completed integer,
  distance_meters double precision,
  social_context text,
  social_score integer,
  location_precision location_precision,
  visitors jsonb -- Return visitor details
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_lat double precision := p_lat;
  v_lng double precision := p_lng;
  v_radius int := COALESCE(radius_meters, 50000);
  v_query text := query_text;

  -- Filters
  v_cities_filter text[];
  v_country_filter text;
  v_architect_ids uuid[];
  v_category_id uuid;
  v_typology_ids uuid[];
  v_attribute_ids uuid[];
  v_access_levels text[] := p_access_levels;
  v_access_logistics text[] := p_access_logistics;
  v_access_costs text[] := p_access_costs;
BEGIN
  -- 1. Parse Inputs

  -- Query Text Fallback
  IF (v_query IS NULL OR v_query = '') AND filters ? 'query' AND filters->>'query' IS NOT NULL THEN
    v_query := filters->>'query';
  END IF;

  -- Filters
  IF filters IS NOT NULL THEN
    -- Cities
    IF filters ? 'cities' AND jsonb_typeof(filters->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'cities')) INTO v_cities_filter;
    END IF;

    -- Country
    v_country_filter := filters->>'country';

    -- Architects (Support 'architect_ids' and legacy 'architects')
    IF filters ? 'architect_ids' AND jsonb_typeof(filters->'architect_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'architect_ids')::uuid) INTO v_architect_ids;
        EXCEPTION WHEN OTHERS THEN
            v_architect_ids := NULL;
        END;
    ELSIF filters ? 'architects' AND jsonb_typeof(filters->'architects') = 'array' THEN
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


    -- Access Filters
    IF filters ? 'access_levels' AND jsonb_typeof(filters->'access_levels') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'access_levels')) INTO v_access_levels;
    END IF;
    IF filters ? 'access_logistics' AND jsonb_typeof(filters->'access_logistics') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'access_logistics')) INTO v_access_logistics;
    END IF;
    IF filters ? 'access_costs' AND jsonb_typeof(filters->'access_costs') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'access_costs')) INTO v_access_costs;
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
  WITH friends AS (
    SELECT following_id as friend_id
    FROM follows
    WHERE follower_id = v_user_id
  ),
  social_signals AS (
    -- 1. Recommendations
    SELECT
      r.building_id,
      100 as score,
      'Recommended by @' || p.username as context,
      r.created_at as signal_date,
      NULL::jsonb as visitors -- No visitors for recommendations
    FROM recommendations r
    JOIN profiles p ON r.recommender_id = p.id
    WHERE r.recipient_id = v_user_id
    AND r.status IN ('pending', 'visit_with')
    AND r.recommender_id IN (SELECT friend_id FROM friends)

    UNION ALL

    -- 2. Friend Visits
    SELECT
      ub.building_id,
      10 * count(*)::int as score,
      'Visited by ' || count(*) || ' friends' as context,
      max(ub.visited_at::timestamp) as signal_date,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'avatar_url', p.avatar_url
        ) ORDER BY ub.visited_at DESC
      ) as visitors
    FROM user_buildings ub
    JOIN profiles p ON ub.user_id = p.id
    WHERE ub.user_id IN (SELECT friend_id FROM friends)
    AND ub.status = 'visited'
    GROUP BY ub.building_id
  ),
  aggregated_social AS (
    SELECT
      ss.building_id,
      sum(ss.score) as total_score,
      (array_agg(ss.context ORDER BY ss.score DESC))[1] as best_context,
      (array_agg(ss.visitors) FILTER (WHERE ss.visitors IS NOT NULL))[1] as visitors
    FROM social_signals ss
    GROUP BY ss.building_id
  ),
  building_architects_agg AS (
    SELECT
      ba.building_id,
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name
        ) ORDER BY a.name
      ) as architects_json,
      array_agg(a.name) as architects_names
    FROM building_architects ba
    JOIN architects a ON ba.architect_id = a.id
    GROUP BY ba.building_id
  )

  SELECT
    b.id,
    b.name,
    b.address,
    st_y(b.location::geometry) as location_lat,
    st_x(b.location::geometry) as location_lng,
    b.city,
    b.country,
    '[]'::jsonb as styles,
    COALESCE(ba_agg.architects_json, '[]'::jsonb) as architects,
    b.year_completed,
    CASE
      WHEN v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
        st_distance(b.location, st_point(v_lng, v_lat)::geography)
      ELSE NULL
    END as distance_meters,
    COALESCE(s.best_context, NULL) as social_context,
    COALESCE(s.total_score, 0)::integer as social_score,
    b.location_precision,
    COALESCE(s.visitors, '[]'::jsonb) as visitors
  FROM buildings b
  LEFT JOIN aggregated_social s ON b.id = s.building_id
  LEFT JOIN building_architects_agg ba_agg ON b.id = ba_agg.building_id
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
      v_lat IS NULL OR v_lng IS NULL OR
      st_dwithin(b.location, st_point(v_lng, v_lat)::geography, v_radius)
    )
    AND
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
  AND (b.status::text IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost' AND b.status::text IS DISTINCT FROM 'Unbuilt')
    AND
    (v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level::text = ANY(v_access_levels))
    AND
    (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics::text = ANY(v_access_logistics))
    AND
    (v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost::text = ANY(v_access_costs))

    AND
    (
      v_query IS NULL OR v_query = '' OR
      b.name ILIKE '%' || v_query || '%' OR
      b.alt_name ILIKE '%' || v_query || '%' OR
      b.address ILIKE '%' || v_query || '%' OR
      array_to_string(ba_agg.architects_names, ' ') ILIKE '%' || v_query || '%' OR
      EXISTS (
        SELECT 1
        FROM unnest(b.aliases) alias
        WHERE alias ILIKE '%' || v_query || '%'
      )
      OR
      (LENGTH(v_query) > 2 AND similarity(b.name, v_query) > 0.3)
    )
  ORDER BY
    CASE WHEN sort_by = 'relevance' THEN COALESCE(s.total_score, 0) END DESC NULLS LAST,
    CASE WHEN sort_by = 'distance' AND v_lat IS NOT NULL THEN
      st_distance(b.location, st_point(v_lng, v_lat)::geography)
    END ASC NULLS LAST,
    CASE WHEN sort_by = 'relevance' AND v_lat IS NOT NULL THEN
       st_distance(b.location, st_point(v_lng, v_lat)::geography)
    END ASC NULLS LAST,
    b.name ASC
  LIMIT p_limit;
END;
$$;

-- Grant permissions (optional but good practice)
GRANT EXECUTE ON FUNCTION search_buildings(text, double precision, double precision, int, jsonb, text, text[], text[], text[], int) TO authenticated;
GRANT EXECUTE ON FUNCTION search_buildings(text, double precision, double precision, int, jsonb, text, text[], text[], text[], int) TO anon;
GRANT EXECUTE ON FUNCTION search_buildings(text, double precision, double precision, int, jsonb, text, text[], text[], text[], int) TO service_role;

CREATE OR REPLACE FUNCTION get_buildings_list(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  filter_criteria jsonb DEFAULT '{}'::jsonb,
  page int DEFAULT 1,
  page_size int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  image_url text,
  lat double precision,
  lng double precision,
  rating int,
  status text,
  architects text[],
  year_completed int,
  city text,
  country text,
  popularity_score int,
  tier_rank text,
  alt_name text -- ADDED
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_safe_min_lat double precision;
  v_safe_max_lat double precision;
  v_safe_min_lng double precision;
  v_safe_max_lng double precision;
  v_center_point geography;

  -- Filter variables
  v_query text;
  v_cities_filter text[];
  v_country_filter text;
  v_architect_ids uuid[];
  v_category_id uuid;
  v_typology_ids uuid[];
  v_attribute_ids uuid[];
  v_year int;
  v_access_levels text[];
  v_access_logistics text[];
  v_access_costs text[];
  v_status_filter text[];
  v_min_rating int;
  v_personal_min_rating int;
  v_sort_by text;

BEGIN
  -- 1. Clamp bounds
  v_safe_min_lat := GREATEST(-90.0, min_lat);
  v_safe_max_lat := LEAST(90.0, max_lat);
  v_safe_min_lng := GREATEST(-180.0, min_lng);
  v_safe_max_lng := LEAST(180.0, max_lng);

  v_center_point := st_setsrid(st_point(
    (v_safe_min_lng + v_safe_max_lng) / 2.0,
    (v_safe_min_lat + v_safe_max_lat) / 2.0
  ), 4326)::geography;

  -- 2. Parse Filters
  IF filter_criteria IS NOT NULL THEN
    IF filter_criteria ? 'query' AND filter_criteria->>'query' IS NOT NULL THEN
      v_query := filter_criteria->>'query';
    END IF;

    IF filter_criteria ? 'sort_by' AND filter_criteria->>'sort_by' IS NOT NULL THEN
      v_sort_by := filter_criteria->>'sort_by';
    END IF;

    IF filter_criteria ? 'cities' AND jsonb_typeof(filter_criteria->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'cities')) INTO v_cities_filter;
    END IF;

    v_country_filter := filter_criteria->>'country';

    IF filter_criteria ? 'architect_ids' AND jsonb_typeof(filter_criteria->'architect_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'architect_ids')::uuid) INTO v_architect_ids;
        EXCEPTION WHEN OTHERS THEN
            v_architect_ids := NULL;
        END;
    ELSIF filter_criteria ? 'architects' AND jsonb_typeof(filter_criteria->'architects') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'architects')::uuid) INTO v_architect_ids;
        EXCEPTION WHEN OTHERS THEN
            v_architect_ids := NULL;
        END;
    END IF;

    IF filter_criteria ? 'category_id' AND filter_criteria->>'category_id' IS NOT NULL THEN
        BEGIN
            v_category_id := (filter_criteria->>'category_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_category_id := NULL;
        END;
    END IF;

    IF filter_criteria ? 'typology_ids' AND jsonb_typeof(filter_criteria->'typology_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'typology_ids')::uuid) INTO v_typology_ids;
        EXCEPTION WHEN OTHERS THEN
            v_typology_ids := NULL;
        END;
    END IF;


    -- Access Filters
    IF filter_criteria ? 'access_levels' AND jsonb_typeof(filter_criteria->'access_levels') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'access_levels')) INTO v_access_levels;
    END IF;
    IF filter_criteria ? 'access_logistics' AND jsonb_typeof(filter_criteria->'access_logistics') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'access_logistics')) INTO v_access_logistics;
    END IF;
    IF filter_criteria ? 'access_costs' AND jsonb_typeof(filter_criteria->'access_costs') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'access_costs')) INTO v_access_costs;
    END IF;

    IF filter_criteria ? 'attribute_ids' AND jsonb_typeof(filter_criteria->'attribute_ids') = 'array' THEN
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'attribute_ids')::uuid) INTO v_attribute_ids;
        EXCEPTION WHEN OTHERS THEN
            v_attribute_ids := NULL;
        END;
    END IF;

    IF filter_criteria ? 'year' AND filter_criteria->>'year' IS NOT NULL THEN
        BEGIN
            v_year := (filter_criteria->>'year')::int;
        EXCEPTION WHEN OTHERS THEN
            v_year := NULL;
        END;
    END IF;

    IF filter_criteria ? 'status' AND jsonb_typeof(filter_criteria->'status') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'status')) INTO v_status_filter;
    END IF;

    IF filter_criteria ? 'min_rating' AND filter_criteria->>'min_rating' IS NOT NULL THEN
        BEGIN
            v_min_rating := (filter_criteria->>'min_rating')::int;
        EXCEPTION WHEN OTHERS THEN
            v_min_rating := 0;
        END;
    ELSE
        v_min_rating := 0;
    END IF;

    IF filter_criteria ? 'personal_min_rating' AND filter_criteria->>'personal_min_rating' IS NOT NULL THEN
        BEGIN
            v_personal_min_rating := (filter_criteria->>'personal_min_rating')::int;
        EXCEPTION WHEN OTHERS THEN
            v_personal_min_rating := 0;
        END;
    ELSE
        v_personal_min_rating := 0;
    END IF;

  ELSE
    v_min_rating := 0;
    v_personal_min_rating := 0;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.slug,
    main_image_url(b) as image_url,
    st_y(b.location::geometry) as lat,
    st_x(b.location::geometry) as lng,
    COALESCE(ub.rating, 0) as rating,
    CASE
      WHEN ub.status = 'visited' THEN 'visited'
      WHEN ub.status = 'pending' THEN 'saved'
      ELSE 'none'
    END as status,
    COALESCE(
      (
        SELECT array_agg(a.name)
        FROM building_architects ba
        JOIN architects a ON ba.architect_id = a.id
        WHERE ba.building_id = b.id
      ),
      '{}'::text[]
    ) as architects,
    b.year_completed,
    b.city,
    b.country,
    b.popularity_score,
    b.tier_rank::text,
    b.alt_name -- ADDED
  FROM buildings b
  LEFT JOIN user_buildings ub ON b.id = ub.building_id AND ub.user_id = auth.uid()
  WHERE
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND b.location IS NOT NULL
    AND (b.status::text IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost' AND b.status::text IS DISTINCT FROM 'Unbuilt')
    AND (
      (v_query IS NOT NULL AND trim(v_query) <> '')
      OR
      (
          (
            (v_safe_max_lng - v_safe_min_lng) > 179
            AND
            b.location::geometry && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)
          )
          OR
          (
            (v_safe_max_lng - v_safe_min_lng) <= 179
            AND
            b.location && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)::geography
          )
      )
    )
    -- Standard Filters
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
        AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level::text = ANY(v_access_levels))
        AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics::text = ANY(v_access_logistics))
        AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost::text = ANY(v_access_costs))

    AND (
      v_query IS NULL OR v_query = '' OR
      b.name ILIKE '%' || v_query || '%' OR
      b.alt_name ILIKE '%' || v_query || '%' OR -- ADDED
      b.address ILIKE '%' || v_query || '%' OR
      EXISTS (
        SELECT 1 FROM building_architects ba
        JOIN architects a ON ba.architect_id = a.id
        WHERE ba.building_id = b.id AND a.name ILIKE '%' || v_query || '%'
      )
      OR
      EXISTS ( -- ADDED
        SELECT 1
        FROM unnest(b.aliases) AS a(alias)
        WHERE alias ILIKE '%' || v_query || '%'
      )
      OR
      (LENGTH(v_query) > 2 AND similarity(b.name, v_query) > 0.3)
    )
    -- User Filters
    AND (
      v_status_filter IS NULL OR cardinality(v_status_filter) = 0 OR
      (
        ('visited' = ANY(v_status_filter) AND ub.status = 'visited') OR
        ('saved' = ANY(v_status_filter) AND ub.status = 'pending') OR
        ('none' = ANY(v_status_filter) AND (ub.status IS NULL OR ub.status = 'ignored'))
      )
    )
    -- Personal Rating Filter
    AND (
      v_personal_min_rating = 0 OR
      COALESCE(ub.rating, 0) >= v_personal_min_rating
    )
    -- Community Rating (Tier) Filter
    AND (
        v_min_rating = 0 OR
        (v_min_rating = 1 AND b.tier_rank::text IN ('Top 20%', 'Top 10%', 'Top 5%', 'Top 1%')) OR
        (v_min_rating = 2 AND b.tier_rank::text IN ('Top 5%', 'Top 1%')) OR
        (v_min_rating = 3 AND b.tier_rank::text = 'Top 1%')
    )
  ORDER BY
    COALESCE(ub.rating, 0) DESC,
    CASE
      WHEN v_sort_by = 'popularity' THEN b.popularity_score
      WHEN v_sort_by IS NULL AND (v_query IS NULL OR v_query = '') THEN b.popularity_score
      ELSE NULL
    END DESC NULLS LAST,
    st_distance(b.location::geography, v_center_point) ASC
  LIMIT page_size
  OFFSET (page - 1) * page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, int, int) TO anon;
GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, int, int) TO service_role;
