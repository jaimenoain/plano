-- Migration: 20270881000000_fix_get_buildings_list_search.sql
-- Fix get_buildings_list to match get_map_clusters_v2 search logic and allow global search

DROP FUNCTION IF EXISTS get_buildings_list(double precision, double precision, double precision, double precision, jsonb, integer, integer);

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
  alt_name text,
  winner_award_name text
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
  v_award_id uuid;
  v_award_outcome text;
  v_award_year_from int;
  v_award_year_to int;
  v_construction_statuses text[];

BEGIN
  -- 1. Clamp bounds and calculate center
  v_safe_min_lat := GREATEST(-90.0, min_lat);
  v_safe_max_lat := LEAST(90.0, max_lat);
  v_safe_min_lng := GREATEST(-180.0, min_lng);
  v_safe_max_lng := LEAST(180.0, max_lng);

  -- Ensure min <= max for lat
  IF v_safe_min_lat > v_safe_max_lat THEN
    DECLARE
      temp double precision := v_safe_min_lat;
    BEGIN
      v_safe_min_lat := v_safe_max_lat;
      v_safe_max_lat := temp;
    END;
  END IF;

  v_center_point := st_setsrid(st_point((v_safe_min_lng + v_safe_max_lng) / 2.0, (v_safe_min_lat + v_safe_max_lat) / 2.0), 4326)::geography;

  -- 2. Parse Filters
  IF filter_criteria IS NOT NULL THEN
    v_query := filter_criteria->>'query';
    v_sort_by := filter_criteria->>'sort_by';
    
    IF filter_criteria ? 'cities' AND jsonb_typeof(filter_criteria->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'cities')) INTO v_cities_filter;
    END IF;
    
    v_country_filter := filter_criteria->>'country';
    
    IF filter_criteria ? 'architect_ids' AND jsonb_typeof(filter_criteria->'architect_ids') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'architect_ids')::uuid) INTO v_architect_ids;
    ELSIF filter_criteria ? 'architects' AND jsonb_typeof(filter_criteria->'architects') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'architects')::uuid) INTO v_architect_ids;
    END IF;
    
    IF filter_criteria ? 'category_id' THEN v_category_id := (filter_criteria->>'category_id')::uuid; END IF;
    
    IF filter_criteria ? 'typology_ids' AND jsonb_typeof(filter_criteria->'typology_ids') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'typology_ids')::uuid) INTO v_typology_ids;
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
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'attribute_ids')::uuid) INTO v_attribute_ids;
    END IF;
    
    IF filter_criteria ? 'construction_statuses' AND jsonb_typeof(filter_criteria->'construction_statuses') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'construction_statuses')) INTO v_construction_statuses;
    END IF;

    IF filter_criteria ? 'year' THEN v_year := (filter_criteria->>'year')::int; END IF;
    
    IF filter_criteria ? 'status' AND jsonb_typeof(filter_criteria->'status') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'status')) INTO v_status_filter;
    END IF;
    
    v_min_rating := COALESCE((filter_criteria->>'min_rating')::int, 0);
    v_personal_min_rating := COALESCE((filter_criteria->>'personal_min_rating')::int, 0);
    
    IF filter_criteria ? 'credit_company_id' THEN v_credit_company_id := (filter_criteria->>'credit_company_id')::uuid; END IF;
    
    IF filter_criteria ? 'credit_roles' AND jsonb_typeof(filter_criteria->'credit_roles') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'credit_roles')) INTO v_credit_roles;
    END IF;

    -- Award Filters
    IF filter_criteria ? 'award_id' THEN v_award_id := (filter_criteria->>'award_id')::uuid; END IF;
    IF filter_criteria ? 'award_outcome' THEN v_award_outcome := filter_criteria->>'award_outcome'; END IF;
    IF filter_criteria ? 'award_year_from' THEN v_award_year_from := (filter_criteria->>'award_year_from')::int; END IF;
    IF filter_criteria ? 'award_year_to' THEN v_award_year_to := (filter_criteria->>'award_year_to')::int; END IF;
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
    ub.status::text as status, 
    COALESCE(ba_agg.credit_names, '{}'::text[]) as credit_names, 
    b.year_completed, 
    b.city, 
    b.country, 
    b.popularity_score, 
    b.tier_rank::text, 
    b.alt_name,
    w.award_name as winner_award_name
  FROM buildings b
  LEFT JOIN user_buildings ub ON b.id = ub.building_id AND ub.user_id = auth.uid()
  LEFT JOIN (
      SELECT bc.building_id, array_agg(DISTINCT COALESCE(p.name, c.name)) FILTER (WHERE COALESCE(p.name, c.name) IS NOT NULL) AS credit_names
      FROM building_credits bc
      LEFT JOIN people p ON bc.person_id = p.id
      LEFT JOIN companies c ON bc.company_id = c.id
      WHERE bc.status NOT IN ('hidden')
      GROUP BY bc.building_id
  ) ba_agg ON b.id = ba_agg.building_id
  LEFT JOIN LATERAL (
      SELECT a.name as award_name
      FROM public.award_recipients ar
      JOIN public.award_editions ae ON ae.id = ar.edition_id
      JOIN public.awards a ON a.id = ae.award_id
      WHERE ar.recipient_building_id = b.id
        AND ar.outcome = 'winner'
      ORDER BY ae.year DESC, ae.edition_date DESC
      LIMIT 1
  ) w ON true
  WHERE (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND b.location IS NOT NULL
    AND (
      (v_query IS NOT NULL AND trim(v_query) <> '')
      OR
      (
        ( (max_lng - min_lng) > 179 AND b.location::geometry && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326) )
        OR
        ( (max_lng - min_lng) <= 179 AND b.location && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)::geography )
      )
    )
    -- Exclude ignored buildings unless explicitly filtered for 'none'
    AND (
      (v_status_filter IS NOT NULL AND 'none' = ANY(v_status_filter))
      OR ub.status::text IS DISTINCT FROM 'ignored'
    )
    AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
    AND (v_country_filter IS NULL OR b.country = v_country_filter)
    AND ( v_architect_ids IS NULL OR cardinality(v_architect_ids) = 0 OR EXISTS ( SELECT 1 FROM building_credits bc WHERE bc.building_id = b.id AND bc.status NOT IN ('hidden') AND (bc.person_id = ANY(v_architect_ids) OR bc.company_id = ANY(v_architect_ids)) ) )
    AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
    AND ( v_typology_ids IS NULL OR cardinality(v_typology_ids) = 0 OR EXISTS ( SELECT 1 FROM building_functional_typologies bft WHERE bft.building_id = b.id AND bft.typology_id = ANY(v_typology_ids) ) )
    AND ( v_attribute_ids IS NULL OR cardinality(v_attribute_ids) = 0 OR EXISTS ( SELECT 1 FROM building_attributes batt WHERE batt.building_id = b.id AND batt.attribute_id = ANY(v_attribute_ids) ) )
    AND (v_year IS NULL OR b.year_completed = v_year)
    AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level::text = ANY(v_access_levels))
    AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics::text = ANY(v_access_logistics))
    AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost::text = ANY(v_access_costs))
    AND (
      ( (v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0) AND (b.status::text NOT IN ('Demolished', 'Lost', 'Under Construction', 'Unbuilt')) )
      OR b.status::text = ANY(v_construction_statuses)
    )
    AND (
      v_query IS NULL OR v_query = '' 
      OR b.name ILIKE '%' || v_query || '%' 
      OR b.alt_name ILIKE '%' || v_query || '%' 
      OR b.address ILIKE '%' || v_query || '%' 
      OR array_to_string(ba_agg.credit_names, ' ') ILIKE '%' || v_query || '%'
      OR EXISTS (
        SELECT 1 
        FROM unnest(b.aliases) AS a(alias) 
        WHERE alias ILIKE '%' || v_query || '%' 
      )
      OR (LENGTH(v_query) > 2 AND similarity(b.name, v_query) > 0.3)
    )
    AND ( v_status_filter IS NULL OR cardinality(v_status_filter) = 0 OR ( ('visited' = ANY(v_status_filter) AND ub.status::text = 'visited') OR ('saved' = ANY(v_status_filter) AND ub.status::text = 'pending') OR ('none' = ANY(v_status_filter) AND (ub.status IS NULL OR ub.status::text = 'ignored')) ) )
    AND (v_personal_min_rating = 0 OR COALESCE(ub.rating, 0) >= v_personal_min_rating)
    AND ( v_min_rating = 0 OR (v_min_rating = 1 AND b.tier_rank::text IN ('Top 20%', 'Top 10%', 'Top 5%', 'Top 1%')) OR (v_min_rating = 2 AND b.tier_rank::text IN ('Top 5%', 'Top 1%')) OR (v_min_rating = 3 AND b.tier_rank::text = 'Top 1%') )
    AND public.building_matches_credit_filters(b.id, v_credit_company_id, v_credit_roles)
    AND (v_award_id IS NULL OR b.id IN (SELECT building_id FROM public.get_buildings_with_awards(v_award_id, v_award_outcome, v_award_year_from, v_award_year_to)))
  ORDER BY
    COALESCE(ub.rating, 0) DESC,
    CASE WHEN v_sort_by = 'popularity' THEN b.popularity_score END DESC,
    CASE WHEN v_sort_by = 'distance' THEN b.location <-> v_center_point END ASC,
    CASE WHEN v_sort_by = 'newest' THEN b.year_completed END DESC,
    CASE WHEN v_sort_by IS NULL AND (v_query IS NULL OR v_query = '') THEN b.popularity_score END DESC NULLS LAST,
    b.name ASC
  LIMIT page_size OFFSET (page - 1) * page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, integer, integer) TO service_role;
