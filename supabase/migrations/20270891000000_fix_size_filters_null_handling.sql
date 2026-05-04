-- Fix size filtering logic in search RPCs to ensure buildings with NULL size/storeys 
-- are not excluded when no filter is applied or when filter is set to 0.

-- 1. Update get_map_clusters
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
  v_credit_company_id uuid;
  v_credit_roles text[];
  v_size_categories text[];
  v_min_size_sqm numeric;
  v_max_size_sqm numeric;
  v_min_storeys int;
  v_max_storeys int;
BEGIN
  -- Dynamic Grid Calculation
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

    -- Point / Radius mapping
    IF filters ? 'lat' AND filters->>'lat' IS NOT NULL THEN
      BEGIN v_lat := (filters->>'lat')::double precision; EXCEPTION WHEN OTHERS THEN v_lat := NULL; END;
    END IF;
    IF filters ? 'lng' AND filters->>'lng' IS NOT NULL THEN
      BEGIN v_lng := (filters->>'lng')::double precision; EXCEPTION WHEN OTHERS THEN v_lng := NULL; END;
    END IF;
    IF filters ? 'radius' AND filters->>'radius' IS NOT NULL THEN
      BEGIN v_radius := (filters->>'radius')::double precision; EXCEPTION WHEN OTHERS THEN v_radius := NULL; END;
    END IF;

    -- Credit Filters
    IF filters ? 'credit_company_id' AND filters->>'credit_company_id' IS NOT NULL THEN
      BEGIN v_credit_company_id := (filters->>'credit_company_id')::uuid; EXCEPTION WHEN OTHERS THEN v_credit_company_id := NULL; END;
    END IF;
    IF filters ? 'credit_roles' AND jsonb_typeof(filters->'credit_roles') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'credit_roles')) INTO v_credit_roles;
    END IF;

    -- Size Filters
    IF filters ? 'size_categories' AND jsonb_typeof(filters->'size_categories') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'size_categories')) INTO v_size_categories;
    END IF;
    IF filters ? 'min_size_sqm' AND filters->>'min_size_sqm' IS NOT NULL THEN
      BEGIN v_min_size_sqm := (filters->>'min_size_sqm')::numeric; EXCEPTION WHEN OTHERS THEN v_min_size_sqm := NULL; END;
    END IF;
    IF filters ? 'max_size_sqm' AND filters->>'max_size_sqm' IS NOT NULL THEN
      BEGIN v_max_size_sqm := (filters->>'max_size_sqm')::numeric; EXCEPTION WHEN OTHERS THEN v_max_size_sqm := NULL; END;
    END IF;
    IF filters ? 'min_storeys' AND filters->>'min_storeys' IS NOT NULL THEN
      BEGIN v_min_storeys := (filters->>'min_storeys')::int; EXCEPTION WHEN OTHERS THEN v_min_storeys := NULL; END;
    END IF;
    IF filters ? 'max_storeys' AND filters->>'max_storeys' IS NOT NULL THEN
      BEGIN v_max_storeys := (filters->>'max_storeys')::int; EXCEPTION WHEN OTHERS THEN v_max_storeys := NULL; END;
    END IF;

  END IF;

  -- Ensure bounding box logic is safe
  v_safe_min_lat := min_lat; v_safe_max_lat := max_lat; v_safe_min_lng := min_lng; v_safe_max_lng := max_lng;
  IF v_safe_min_lat > v_safe_max_lat THEN v_safe_min_lat := max_lat; v_safe_max_lat := min_lat; END IF;

  RETURN QUERY
  WITH building_credit_names_agg AS (
      SELECT
          bc.building_id,
          array_agg(DISTINCT COALESCE(p.name, c.name)) FILTER (WHERE COALESCE(p.name, c.name) IS NOT NULL) AS credit_names
      FROM building_credits bc
      LEFT JOIN people p ON bc.person_id = p.id
      LEFT JOIN companies c ON bc.company_id = c.id
      WHERE bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum
      GROUP BY bc.building_id
  ),
  filtered_buildings AS (
    SELECT
      b.id, b.location, b.name, b.slug, b.popularity_score, b.tier_rank::text as tier_rank, main_image_url(b) as image_url, ba_agg.credit_names as architect_names
    FROM buildings b
    LEFT JOIN building_credit_names_agg ba_agg ON b.id = ba_agg.building_id
    WHERE
    (
      ((v_lat IS NULL AND v_lng IS NULL AND v_radius IS NULL) AND
      (
        ((max_lng - min_lng) > 179 AND b.location::geometry && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326))
        OR
        ((max_lng - min_lng) <= 179 AND b.location && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)::geography)
      ))
      OR
      (v_lat IS NOT NULL AND v_lng IS NOT NULL AND st_dwithin(b.location, st_point(v_lng, v_lat)::geography, v_radius))
    )
    AND (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND (b.status::text IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost' AND b.status::text IS DISTINCT FROM 'Unbuilt')
    AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level::text = ANY(v_access_levels))
    AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics::text = ANY(v_access_logistics))
    AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost::text = ANY(v_access_costs))
    AND (
      ((v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0) AND (b.status::text IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost' AND b.status::text IS DISTINCT FROM 'Under Construction' AND b.status::text IS DISTINCT FROM 'Unbuilt'))
      OR b.status::text = ANY(v_construction_statuses)
    )
    AND (v_query IS NULL OR v_query = '' OR b.name ILIKE '%' || v_query || '%' OR b.alt_name ILIKE '%' || v_query || '%' OR b.address ILIKE '%' || v_query || '%' OR array_to_string(ba_agg.credit_names, ' ') ILIKE '%' || v_query || '%')
    AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
    AND (v_country_filter IS NULL OR b.country = v_country_filter)
    AND (v_architect_ids IS NULL OR cardinality(v_architect_ids) = 0 OR EXISTS (SELECT 1 FROM building_credits bc WHERE bc.building_id = b.id AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum AND (bc.person_id = ANY(v_architect_ids) OR bc.company_id = ANY(v_architect_ids))))
    AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
    AND (v_typology_ids IS NULL OR cardinality(v_typology_ids) = 0 OR EXISTS (SELECT 1 FROM building_functional_typologies bft WHERE bft.building_id = b.id AND bft.typology_id = ANY(v_typology_ids)))
    AND (v_attribute_ids IS NULL OR cardinality(v_attribute_ids) = 0 OR EXISTS (SELECT 1 FROM building_attributes batt WHERE batt.building_id = b.id AND batt.attribute_id = ANY(v_attribute_ids)))
    AND (v_year IS NULL OR b.year_completed = v_year)
    AND public.building_matches_credit_filters(b.id, v_credit_company_id, v_credit_roles)
    AND (v_size_categories IS NULL OR cardinality(v_size_categories) = 0 OR b.size_category = ANY(v_size_categories))
    AND (v_min_size_sqm IS NULL OR v_min_size_sqm = 0 OR b.size_sqm >= v_min_size_sqm)
    AND (v_max_size_sqm IS NULL OR b.size_sqm <= v_max_size_sqm)
    AND (v_min_storeys IS NULL OR v_min_storeys <= 1 OR b.storeys >= v_min_storeys)
    AND (v_max_storeys IS NULL OR b.storeys <= v_max_storeys)
    LIMIT row_limit
  )
  SELECT
    CASE WHEN count(*) > 1 THEN md5(format('%s-%s', st_x(st_snaptogrid(fb.location::geometry, v_grid_size)), st_y(st_snaptogrid(fb.location::geometry, v_grid_size))))::text ELSE max(fb.id::text) END as id,
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
  GROUP BY st_snaptogrid(fb.location::geometry, v_grid_size);
END;
$$;

-- 2. Update get_buildings_list
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
  credit_names text[],
  year_completed int,
  city text,
  country text,
  popularity_score int,
  tier_rank text,
  alt_name text
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
  v_credit_company_id uuid;
  v_credit_roles text[];
  v_size_categories text[];
  v_min_size_sqm numeric;
  v_max_size_sqm numeric;
  v_min_storeys int;
  v_max_storeys int;

BEGIN
  v_safe_min_lat := GREATEST(-90.0, min_lat);
  v_safe_max_lat := LEAST(90.0, max_lat);
  v_safe_min_lng := GREATEST(-180.0, min_lng);
  v_safe_max_lng := LEAST(180.0, max_lng);
  v_center_point := st_setsrid(st_point((v_safe_min_lng + v_safe_max_lng) / 2.0, (v_safe_min_lat + v_safe_max_lat) / 2.0), 4326)::geography;

  IF filter_criteria IS NOT NULL THEN
    v_query := filter_criteria->>'query';
    v_sort_by := filter_criteria->>'sort_by';
    IF filter_criteria ? 'cities' AND jsonb_typeof(filter_criteria->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'cities')) INTO v_cities_filter;
    END IF;
    v_country_filter := filter_criteria->>'country';
    IF filter_criteria ? 'architect_ids' AND jsonb_typeof(filter_criteria->'architect_ids') = 'array' THEN
        BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'architect_ids')::uuid) INTO v_architect_ids; EXCEPTION WHEN OTHERS THEN v_architect_ids := NULL; END;
    ELSIF filter_criteria ? 'architects' AND jsonb_typeof(filter_criteria->'architects') = 'array' THEN
        BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'architects')::uuid) INTO v_architect_ids; EXCEPTION WHEN OTHERS THEN v_architect_ids := NULL; END;
    END IF;
    IF filter_criteria ? 'category_id' AND filter_criteria->>'category_id' IS NOT NULL THEN
        BEGIN v_category_id := (filter_criteria->>'category_id')::uuid; EXCEPTION WHEN OTHERS THEN v_category_id := NULL; END;
    END IF;
    IF filter_criteria ? 'typology_ids' AND jsonb_typeof(filter_criteria->'typology_ids') = 'array' THEN
        BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'typology_ids')::uuid) INTO v_typology_ids; EXCEPTION WHEN OTHERS THEN v_typology_ids := NULL; END;
    END IF;
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
        BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'attribute_ids')::uuid) INTO v_attribute_ids; EXCEPTION WHEN OTHERS THEN v_attribute_ids := NULL; END;
    END IF;
    IF filter_criteria ? 'year' AND filter_criteria->>'year' IS NOT NULL THEN
        BEGIN v_year := (filter_criteria->>'year')::int; EXCEPTION WHEN OTHERS THEN v_year := NULL; END;
    END IF;
    IF filter_criteria ? 'status' AND jsonb_typeof(filter_criteria->'status') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'status')) INTO v_status_filter;
    END IF;
    v_min_rating := COALESCE((filter_criteria->>'min_rating')::int, 0);
    v_personal_min_rating := COALESCE((filter_criteria->>'personal_min_rating')::int, 0);
    IF filter_criteria ? 'credit_company_id' AND filter_criteria->>'credit_company_id' IS NOT NULL THEN
      BEGIN v_credit_company_id := (filter_criteria->>'credit_company_id')::uuid; EXCEPTION WHEN OTHERS THEN v_credit_company_id := NULL; END;
    END IF;
    IF filter_criteria ? 'credit_roles' AND jsonb_typeof(filter_criteria->'credit_roles') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'credit_roles')) INTO v_credit_roles;
    END IF;

    -- Size Filters
    IF filter_criteria ? 'size_categories' AND jsonb_typeof(filter_criteria->'size_categories') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'size_categories')) INTO v_size_categories;
    END IF;
    IF filter_criteria ? 'min_size_sqm' AND filter_criteria->>'min_size_sqm' IS NOT NULL THEN
      BEGIN v_min_size_sqm := (filter_criteria->>'min_size_sqm')::numeric; EXCEPTION WHEN OTHERS THEN v_min_size_sqm := NULL; END;
    END IF;
    IF filter_criteria ? 'max_size_sqm' AND filter_criteria->>'max_size_sqm' IS NOT NULL THEN
      BEGIN v_max_size_sqm := (filter_criteria->>'max_size_sqm')::numeric; EXCEPTION WHEN OTHERS THEN v_max_size_sqm := NULL; END;
    END IF;
    IF filter_criteria ? 'min_storeys' AND filter_criteria->>'min_storeys' IS NOT NULL THEN
      BEGIN v_min_storeys := (filter_criteria->>'min_storeys')::int; EXCEPTION WHEN OTHERS THEN v_min_storeys := NULL; END;
    END IF;
    IF filter_criteria ? 'max_storeys' AND filter_criteria->>'max_storeys' IS NOT NULL THEN
      BEGIN v_max_storeys := (filter_criteria->>'max_storeys')::int; EXCEPTION WHEN OTHERS THEN v_max_storeys := NULL; END;
    END IF;
  ELSE
    v_min_rating := 0; v_personal_min_rating := 0;
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.name, b.slug, main_image_url(b) as image_url, st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng,
    COALESCE(ub.rating, 0) as rating,
    CASE WHEN ub.status = 'visited' THEN 'visited' WHEN ub.status = 'pending' THEN 'saved' ELSE 'none' END as status,
    COALESCE((SELECT array_agg(DISTINCT COALESCE(p.name, c.name)) FILTER (WHERE COALESCE(p.name, c.name) IS NOT NULL) FROM building_credits bc LEFT JOIN people p ON bc.person_id = p.id LEFT JOIN companies c ON bc.company_id = c.id WHERE bc.building_id = b.id AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum), '{}'::text[]) as credit_names,
    b.year_completed, b.city, b.country, b.popularity_score, b.tier_rank::text, b.alt_name
  FROM buildings b
  LEFT JOIN user_buildings ub ON b.id = ub.building_id AND ub.user_id = auth.uid()
  WHERE
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND b.location IS NOT NULL
    AND (b.status::text IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost' AND b.status::text IS DISTINCT FROM 'Unbuilt')
    AND ((v_query IS NOT NULL AND trim(v_query) <> '') OR (((v_safe_max_lng - v_safe_min_lng) > 179 AND b.location::geometry && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)) OR ((v_safe_max_lng - v_safe_min_lng) <= 179 AND b.location && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)::geography)))
    AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
    AND (v_country_filter IS NULL OR b.country = v_country_filter)
    AND (v_architect_ids IS NULL OR cardinality(v_architect_ids) = 0 OR EXISTS (SELECT 1 FROM building_credits bc WHERE bc.building_id = b.id AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum AND (bc.person_id = ANY(v_architect_ids) OR bc.company_id = ANY(v_architect_ids))))
    AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
    AND (v_typology_ids IS NULL OR cardinality(v_typology_ids) = 0 OR EXISTS (SELECT 1 FROM building_functional_typologies bft WHERE bft.building_id = b.id AND bft.typology_id = ANY(v_typology_ids)))
    AND (v_attribute_ids IS NULL OR cardinality(v_attribute_ids) = 0 OR EXISTS (SELECT 1 FROM building_attributes batt WHERE batt.building_id = b.id AND batt.attribute_id = ANY(v_attribute_ids)))
    AND (v_year IS NULL OR b.year_completed = v_year)
    AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level::text = ANY(v_access_levels))
    AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics::text = ANY(v_access_logistics))
    AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost::text = ANY(v_access_costs))
    AND (v_query IS NULL OR v_query = '' OR b.name ILIKE '%' || v_query || '%' OR b.alt_name ILIKE '%' || v_query || '%' OR b.address ILIKE '%' || v_query || '%' OR EXISTS (SELECT 1 FROM building_credits bc LEFT JOIN people p ON bc.person_id = p.id LEFT JOIN companies c ON bc.company_id = c.id WHERE bc.building_id = b.id AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum AND COALESCE(p.name, c.name) ILIKE '%' || v_query || '%') OR EXISTS (SELECT 1 FROM unnest(b.aliases) AS a(alias) WHERE alias ILIKE '%' || v_query || '%') OR (LENGTH(v_query) > 2 AND similarity(b.name, v_query) > 0.3))
    AND (v_status_filter IS NULL OR cardinality(v_status_filter) = 0 OR (('visited' = ANY(v_status_filter) AND ub.status = 'visited') OR ('saved' = ANY(v_status_filter) AND ub.status = 'pending') OR ('none' = ANY(v_status_filter) AND (ub.status IS NULL OR ub.status = 'ignored'))))
    AND (v_personal_min_rating = 0 OR COALESCE(ub.rating, 0) >= v_personal_min_rating)
    AND (v_min_rating = 0 OR (v_min_rating = 1 AND b.tier_rank::text IN ('Top 20%', 'Top 10%', 'Top 5%', 'Top 1%')) OR (v_min_rating = 2 AND b.tier_rank::text IN ('Top 5%', 'Top 1%')) OR (v_min_rating = 3 AND b.tier_rank::text = 'Top 1%'))
    AND public.building_matches_credit_filters(b.id, v_credit_company_id, v_credit_roles)
    AND (v_size_categories IS NULL OR cardinality(v_size_categories) = 0 OR b.size_category = ANY(v_size_categories))
    AND (v_min_size_sqm IS NULL OR v_min_size_sqm = 0 OR b.size_sqm >= v_min_size_sqm)
    AND (v_max_size_sqm IS NULL OR b.size_sqm <= v_max_size_sqm)
    AND (v_min_storeys IS NULL OR v_min_storeys <= 1 OR b.storeys >= v_min_storeys)
    AND (v_max_storeys IS NULL OR b.storeys <= v_max_storeys)
  ORDER BY COALESCE(ub.rating, 0) DESC, CASE WHEN v_sort_by = 'popularity' THEN b.popularity_score WHEN v_sort_by IS NULL AND (v_query IS NULL OR v_query = '') THEN b.popularity_score ELSE NULL END DESC NULLS LAST, st_distance(b.location::geography, v_center_point) ASC
  LIMIT page_size OFFSET (page - 1) * page_size;
END;
$$;
