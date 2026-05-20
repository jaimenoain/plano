-- Century filter: `centuries` int[] on filter_criteria / p_filters for map browse, SERP list, and Find search.
-- Replaces get_map_clusters_v3 (from photography_gap_layer) and search_buildings_v2 / get_buildings_list (from serp_building_url_fields).

DROP FUNCTION IF EXISTS get_map_clusters_v3(double precision, double precision, double precision, double precision, double precision, jsonb);

CREATE OR REPLACE FUNCTION get_map_clusters_v3(
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
  popularity_score integer,
  tier_rank text,
  max_tier integer,
  winner_award_name text,
  photos_count integer,
  city text
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

  v_cities_filter text[];
  v_country_filter text;
  v_architect_ids uuid[];
  v_category_id uuid;
  v_typology_ids uuid[];
  v_attribute_ids uuid[];
  v_year int;
  v_centuries int[];
  v_access_levels text[];
  v_access_logistics text[];
  v_access_costs text[];
  v_construction_statuses text[];
  v_status_filter text[];
  v_min_rating int := 0;
  v_personal_min_rating int := 0;
  v_hide_saved boolean := false;
  v_hide_visited boolean := false;
  v_ranking_preference text := 'global';
  v_credit_company_id uuid;
  v_credit_roles text[];
  v_size_categories text[];
  v_min_size_sqm numeric;
  v_max_size_sqm numeric;
  v_min_storeys int;
  v_max_storeys int;
  v_award_id uuid;
  v_award_outcome text;
  v_award_year_from int;
  v_award_year_to int;
  
  -- Gap Layer filters
  v_photography_gaps boolean := false;
  v_gap_photo_counts int[];
BEGIN
  v_grid_size := 85.0 / pow(2, zoom_level);
  IF zoom_level >= 13 THEN v_grid_size := v_grid_size / 6.0;
  ELSIF zoom_level >= 11 THEN v_grid_size := v_grid_size / 3.0; END IF;

  v_lat_span := max_lat - min_lat;
  v_lng_span := max_lng - min_lng;
  v_safe_min_lat := GREATEST(-90.0, min_lat - (v_lat_span * 0.1));
  v_safe_max_lat := LEAST(90.0, max_lat + (v_lat_span * 0.1));
  v_safe_min_lng := GREATEST(-180.0, min_lng - (v_lng_span * 0.1));
  v_safe_max_lng := LEAST(180.0, max_lng + (v_lng_span * 0.1));

  IF filter_criteria IS NOT NULL THEN
    IF filter_criteria ? 'cities' AND jsonb_typeof(filter_criteria->'cities') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'cities')) INTO v_cities_filter;
    END IF;
    v_country_filter := filter_criteria->>'country';
    IF filter_criteria ? 'architect_ids' AND jsonb_typeof(filter_criteria->'architect_ids') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'architect_ids')::uuid) INTO v_architect_ids; EXCEPTION WHEN OTHERS THEN v_architect_ids := NULL; END;
    END IF;
    IF filter_criteria ? 'category_id' AND filter_criteria->>'category_id' IS NOT NULL THEN
      BEGIN v_category_id := (filter_criteria->>'category_id')::uuid; EXCEPTION WHEN OTHERS THEN v_category_id := NULL; END;
    END IF;
    IF filter_criteria ? 'typology_ids' AND jsonb_typeof(filter_criteria->'typology_ids') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'typology_ids')::uuid) INTO v_typology_ids; EXCEPTION WHEN OTHERS THEN v_typology_ids := NULL; END;
    END IF;
    IF filter_criteria ? 'attribute_ids' AND jsonb_typeof(filter_criteria->'attribute_ids') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'attribute_ids')::uuid) INTO v_attribute_ids; EXCEPTION WHEN OTHERS THEN v_attribute_ids := NULL; END;
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
    IF filter_criteria ? 'construction_statuses' AND jsonb_typeof(filter_criteria->'construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'construction_statuses')) INTO v_construction_statuses;
    END IF;
    IF filter_criteria ? 'year' AND filter_criteria->>'year' IS NOT NULL THEN
      BEGIN v_year := (filter_criteria->>'year')::int; EXCEPTION WHEN OTHERS THEN v_year := NULL; END;
    END IF;
    IF filter_criteria ? 'centuries' AND jsonb_typeof(filter_criteria->'centuries') = 'array' THEN
      BEGIN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'centuries')::int) INTO v_centuries;
      EXCEPTION WHEN OTHERS THEN v_centuries := NULL;
      END;
    END IF;
    IF filter_criteria ? 'status' AND jsonb_typeof(filter_criteria->'status') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'status')) INTO v_status_filter;
    END IF;
    v_min_rating := COALESCE((filter_criteria->>'min_rating')::int, 0);
    v_personal_min_rating := COALESCE((filter_criteria->>'personal_min_rating')::int, 0);
    v_hide_saved := COALESCE((filter_criteria->>'hide_saved')::boolean, false);
    v_hide_visited := COALESCE((filter_criteria->>'hide_visited')::boolean, false);
    v_ranking_preference := COALESCE(filter_criteria->>'ranking_preference', 'global');
    IF filter_criteria ? 'credit_company_id' AND filter_criteria->>'credit_company_id' IS NOT NULL THEN
      BEGIN v_credit_company_id := (filter_criteria->>'credit_company_id')::uuid; EXCEPTION WHEN OTHERS THEN v_credit_company_id := NULL; END;
    END IF;
    IF filter_criteria ? 'credit_roles' AND jsonb_typeof(filter_criteria->'credit_roles') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'credit_roles')) INTO v_credit_roles;
    END IF;
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
    IF filter_criteria ? 'award_id' AND filter_criteria->>'award_id' IS NOT NULL THEN
      BEGIN v_award_id := (filter_criteria->>'award_id')::uuid; EXCEPTION WHEN OTHERS THEN v_award_id := NULL; END;
    END IF;
    IF filter_criteria ? 'award_outcome' AND filter_criteria->>'award_outcome' IS NOT NULL THEN
      v_award_outcome := filter_criteria->>'award_outcome';
    END IF;
    IF filter_criteria ? 'award_year_from' AND filter_criteria->>'award_year_from' IS NOT NULL THEN
      BEGIN v_award_year_from := (filter_criteria->>'award_year_from')::int; EXCEPTION WHEN OTHERS THEN v_award_year_from := NULL; END;
    END IF;
    IF filter_criteria ? 'award_year_to' AND filter_criteria->>'award_year_to' IS NOT NULL THEN
      BEGIN v_award_year_to := (filter_criteria->>'award_year_to')::int; EXCEPTION WHEN OTHERS THEN v_award_year_to := NULL; END;
    END IF;
    
    -- Gap Layer
    v_photography_gaps := COALESCE((filter_criteria->>'photography_gaps')::boolean, false);
    IF filter_criteria ? 'gap_photo_counts' AND jsonb_typeof(filter_criteria->'gap_photo_counts') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'gap_photo_counts')::int) INTO v_gap_photo_counts;
    END IF;
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
      CASE WHEN ub.status::text = 'visited' THEN 'visited' WHEN ub.status::text = 'pending' THEN 'saved' ELSE 'none' END as mapped_status,
      COALESCE(ub.rating, 0) as mapped_rating,
      w.award_name as winner_award_name,
      COALESCE(pc.photos_count, 0)::int as photos_count,
      b.city
    FROM buildings b
    LEFT JOIN user_buildings ub ON b.id = ub.building_id AND ub.user_id = auth.uid()
    LEFT JOIN (
      -- Total photo count across all reviews for this building
      SELECT ub2.building_id, COUNT(ri.id)::int as photos_count
      FROM user_buildings ub2
      JOIN review_images ri ON ri.review_id = ub2.id
      GROUP BY ub2.building_id
    ) pc ON pc.building_id = b.id
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
      AND (ub.status::text IS DISTINCT FROM 'ignored')
      AND (((v_safe_max_lng - v_safe_min_lng) > 179 AND b.location::geometry && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)) OR ((v_safe_max_lng - v_safe_min_lng) <= 179 AND b.location && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)::geography))
      AND (v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0 OR b.status::text = ANY(v_construction_statuses))
      AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
      AND (v_country_filter IS NULL OR b.country = v_country_filter)
      AND (v_architect_ids IS NULL OR cardinality(v_architect_ids) = 0 OR EXISTS (SELECT 1 FROM building_credits bc WHERE bc.building_id = b.id AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum AND (bc.person_id = ANY(v_architect_ids) OR bc.company_id = ANY(v_architect_ids))))
      AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
      AND (v_typology_ids IS NULL OR cardinality(v_typology_ids) = 0 OR EXISTS (SELECT 1 FROM building_functional_typologies bft WHERE bft.building_id = b.id AND bft.typology_id = ANY(v_typology_ids)))
      AND (v_attribute_ids IS NULL OR cardinality(v_attribute_ids) = 0 OR EXISTS (SELECT 1 FROM building_attributes batt WHERE batt.building_id = b.id AND batt.attribute_id = ANY(v_attribute_ids)))
      AND (v_year IS NULL OR b.year_completed = v_year)
      AND (
        v_centuries IS NULL
        OR cardinality(v_centuries) = 0
        OR (
          (0 = ANY(v_centuries) AND b.century IS NOT NULL AND b.century < 1)
          OR (b.century IS NOT NULL AND b.century > 0 AND b.century = ANY(v_centuries))
        )
      )
      AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level::text = ANY(v_access_levels))
      AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics::text = ANY(v_access_logistics))
      AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost::text = ANY(v_access_costs))
      AND (v_status_filter IS NULL OR cardinality(v_status_filter) = 0 OR (('visited' = ANY(v_status_filter) AND ub.status::text = 'visited') OR ('saved' = ANY(v_status_filter) AND ub.status::text = 'pending') OR ('none' = ANY(v_status_filter) AND (ub.status IS NULL OR ub.status::text = 'ignored'))))
      AND (v_hide_saved IS FALSE OR ub.status::text IS DISTINCT FROM 'pending')
      AND (v_hide_visited IS FALSE OR ub.status::text IS DISTINCT FROM 'visited')
      AND (v_personal_min_rating = 0 OR COALESCE(ub.rating, 0) >= v_personal_min_rating)
      AND (v_min_rating = 0 OR (v_min_rating = 1 AND b.tier_rank::text IN ('Top 20%', 'Top 10%', 'Top 5%', 'Top 1%')) OR (v_min_rating = 2 AND b.tier_rank::text IN ('Top 5%', 'Top 1%')) OR (v_min_rating = 3 AND b.tier_rank::text = 'Top 1%'))
      AND public.building_matches_credit_filters(b.id, v_credit_company_id, v_credit_roles)
      AND (v_size_categories IS NULL OR cardinality(v_size_categories) = 0 OR b.size_category = ANY(v_size_categories))
      AND (v_min_size_sqm IS NULL OR v_min_size_sqm = 0 OR b.size_sqm >= v_min_size_sqm)
      AND (v_max_size_sqm IS NULL OR b.size_sqm <= v_max_size_sqm)
      AND (v_min_storeys IS NULL OR v_min_storeys <= 1 OR b.storeys >= v_min_storeys)
      AND (v_max_storeys IS NULL OR b.storeys <= v_max_storeys)
      AND (v_award_id IS NULL OR b.id IN (SELECT building_id FROM public.get_buildings_with_awards(v_award_id, v_award_outcome, v_award_year_from, v_award_year_to)))
      AND (
        v_gap_photo_counts IS NULL 
        OR cardinality(v_gap_photo_counts) = 0 
        OR (
          (0 = ANY(v_gap_photo_counts) AND COALESCE(pc.photos_count, 0) = 0) OR
          (1 = ANY(v_gap_photo_counts) AND COALESCE(pc.photos_count, 0) BETWEEN 1 AND 2) OR
          (3 = ANY(v_gap_photo_counts) AND COALESCE(pc.photos_count, 0) >= 3)
        )
      )
  )
  SELECT
    CASE WHEN count(*) > 1 THEN md5(format('%s-%s', st_x(st_snaptogrid(fb.location::geometry, v_grid_size)), st_y(st_snaptogrid(fb.location::geometry, v_grid_size))))::text ELSE max(fb.id::text) END as id,
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
    CASE WHEN count(*) > 1 THEN MAX(CASE WHEN v_ranking_preference = 'personal' THEN CASE WHEN fb.mapped_rating >= 3 THEN 3 WHEN fb.mapped_rating = 2 THEN 2 ELSE 1 END ELSE GREATEST(CASE WHEN fb.mapped_rating >= 3 THEN 3 WHEN fb.mapped_rating = 2 THEN 2 ELSE 1 END, CASE WHEN fb.tier_rank::text = 'Top 1%' THEN 4 WHEN fb.tier_rank::text IN ('Top 5%', 'Top 10%') THEN 3 WHEN fb.tier_rank::text = 'Top 20%' THEN 2 ELSE 1 END) END)::int ELSE NULL END as max_tier,
    CASE WHEN count(*) = 1 THEN max(fb.winner_award_name) ELSE NULL END as winner_award_name,
    CASE WHEN count(*) = 1 THEN max(fb.photos_count) ELSE NULL END as photos_count,
    max(fb.city) as city
  FROM filtered_buildings fb
  GROUP BY st_snaptogrid(fb.location::geometry, v_grid_size);
END;
$$;

GRANT EXECUTE ON FUNCTION get_map_clusters_v3(double precision, double precision, double precision, double precision, double precision, jsonb) TO anon, authenticated;

COMMENT ON FUNCTION get_map_clusters_v3(double precision, double precision, double precision, double precision, double precision, jsonb) IS
'Browse-only map cluster RPC (Phase 3 + Photography Gaps). No text search (Find mode owns that). No silent status / popularity exclusions — all defaults are caller-driven via filter_criteria.';
DROP FUNCTION IF EXISTS public.search_buildings_v2(text, int, int, jsonb);

CREATE OR REPLACE FUNCTION public.search_buildings_v2(
  p_query    text,
  p_limit    int     DEFAULT 20,
  p_offset   int     DEFAULT 0,
  p_filters  jsonb   DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id                      uuid,
  name                    text,
  slug                    text,
  alt_name                text,
  hero_image_url          text,
  lat                     double precision,
  lng                     double precision,
  city                    text,
  country                 text,
  year_completed          int,
  popularity_score        int,
  tier_rank               text,
  credit_names            text[],
  rank_score              double precision,
  short_id                int,
  locality_country_code   text,
  locality_city_slug      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_query               text;
  v_tsquery             tsquery;
  v_category_id         uuid;
  v_typology_ids        uuid[];
  v_attribute_ids       uuid[];
  v_credit_company_id   uuid;
  v_credit_roles        text[];
  v_construction_statuses text[];
  v_size_categories     text[];
  v_min_size_sqm        numeric;
  v_max_size_sqm        numeric;
  v_min_storeys         int;
  v_max_storeys         int;
  v_award_id            uuid;
  v_award_outcome       text;
  v_award_year_from     int;
  v_award_year_to       int;
  v_cities_filter       text[];
  v_country_filter      text;
  v_year                int;
  v_centuries           int[];
  v_access_levels       text[];
  v_access_logistics    text[];
  v_access_costs        text[];
BEGIN
  v_query := NULLIF(trim(p_query), '');
  IF v_query IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    v_tsquery := websearch_to_tsquery('simple', v_query);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := NULL;
  END;

  IF p_filters IS NOT NULL THEN
    IF p_filters ? 'category_id' AND p_filters->>'category_id' IS NOT NULL THEN
      BEGIN v_category_id := (p_filters->>'category_id')::uuid; EXCEPTION WHEN OTHERS THEN v_category_id := NULL; END;
    END IF;
    IF p_filters ? 'typology_ids' AND jsonb_typeof(p_filters->'typology_ids') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'typology_ids')::uuid) INTO v_typology_ids; EXCEPTION WHEN OTHERS THEN v_typology_ids := NULL; END;
    END IF;
    IF p_filters ? 'attribute_ids' AND jsonb_typeof(p_filters->'attribute_ids') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'attribute_ids')::uuid) INTO v_attribute_ids; EXCEPTION WHEN OTHERS THEN v_attribute_ids := NULL; END;
    END IF;
    IF p_filters ? 'credit_company_id' AND p_filters->>'credit_company_id' IS NOT NULL THEN
      BEGIN v_credit_company_id := (p_filters->>'credit_company_id')::uuid; EXCEPTION WHEN OTHERS THEN v_credit_company_id := NULL; END;
    END IF;
    IF p_filters ? 'credit_roles' AND jsonb_typeof(p_filters->'credit_roles') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'credit_roles')) INTO v_credit_roles;
    END IF;
    IF p_filters ? 'construction_statuses' AND jsonb_typeof(p_filters->'construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'construction_statuses')) INTO v_construction_statuses;
    END IF;
    IF p_filters ? 'size_categories' AND jsonb_typeof(p_filters->'size_categories') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'size_categories')) INTO v_size_categories;
    END IF;
    IF p_filters ? 'min_size_sqm' AND p_filters->>'min_size_sqm' IS NOT NULL THEN
      BEGIN v_min_size_sqm := (p_filters->>'min_size_sqm')::numeric; EXCEPTION WHEN OTHERS THEN v_min_size_sqm := NULL; END;
    END IF;
    IF p_filters ? 'max_size_sqm' AND p_filters->>'max_size_sqm' IS NOT NULL THEN
      BEGIN v_max_size_sqm := (p_filters->>'max_size_sqm')::numeric; EXCEPTION WHEN OTHERS THEN v_max_size_sqm := NULL; END;
    END IF;
    IF p_filters ? 'min_storeys' AND p_filters->>'min_storeys' IS NOT NULL THEN
      BEGIN v_min_storeys := (p_filters->>'min_storeys')::int; EXCEPTION WHEN OTHERS THEN v_min_storeys := NULL; END;
    END IF;
    IF p_filters ? 'max_storeys' AND p_filters->>'max_storeys' IS NOT NULL THEN
      BEGIN v_max_storeys := (p_filters->>'max_storeys')::int; EXCEPTION WHEN OTHERS THEN v_max_storeys := NULL; END;
    END IF;
    IF p_filters ? 'award_id' AND p_filters->>'award_id' IS NOT NULL THEN
      BEGIN v_award_id := (p_filters->>'award_id')::uuid; EXCEPTION WHEN OTHERS THEN v_award_id := NULL; END;
    END IF;
    IF p_filters ? 'award_outcome' AND p_filters->>'award_outcome' IS NOT NULL THEN
      v_award_outcome := p_filters->>'award_outcome';
    END IF;
    IF p_filters ? 'award_year_from' AND p_filters->>'award_year_from' IS NOT NULL THEN
      BEGIN v_award_year_from := (p_filters->>'award_year_from')::int; EXCEPTION WHEN OTHERS THEN v_award_year_from := NULL; END;
    END IF;
    IF p_filters ? 'award_year_to' AND p_filters->>'award_year_to' IS NOT NULL THEN
      BEGIN v_award_year_to := (p_filters->>'award_year_to')::int; EXCEPTION WHEN OTHERS THEN v_award_year_to := NULL; END;
    END IF;
    IF p_filters ? 'cities' AND jsonb_typeof(p_filters->'cities') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'cities')) INTO v_cities_filter;
    END IF;
    IF p_filters ? 'country' AND p_filters->>'country' IS NOT NULL THEN
      v_country_filter := p_filters->>'country';
    END IF;
    IF p_filters ? 'year' AND p_filters->>'year' IS NOT NULL THEN
      BEGIN v_year := (p_filters->>'year')::int; EXCEPTION WHEN OTHERS THEN v_year := NULL; END;
    END IF;
    IF p_filters ? 'centuries' AND jsonb_typeof(p_filters->'centuries') = 'array' THEN
      BEGIN
        SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'centuries')::int) INTO v_centuries;
      EXCEPTION WHEN OTHERS THEN v_centuries := NULL;
      END;
    END IF;
    IF p_filters ? 'access_levels' AND jsonb_typeof(p_filters->'access_levels') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'access_levels')) INTO v_access_levels;
    END IF;
    IF p_filters ? 'access_logistics' AND jsonb_typeof(p_filters->'access_logistics') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'access_logistics')) INTO v_access_logistics;
    END IF;
    IF p_filters ? 'access_costs' AND jsonb_typeof(p_filters->'access_costs') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'access_costs')) INTO v_access_costs;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.slug,
    b.alt_name,
    main_image_url(b)                   AS hero_image_url,
    ST_Y(b.location::geometry)          AS lat,
    ST_X(b.location::geometry)          AS lng,
    b.city,
    b.country,
    b.year_completed,
    b.popularity_score,
    b.tier_rank::text                   AS tier_rank,
    COALESCE(credits_lateral.names, '{}'::text[]) AS credit_names,
    (
      0.6 * COALESCE(ts_rank_cd(b.search_vector, v_tsquery), 0.0)
      + 0.3 * GREATEST(
          similarity(b.name, v_query),
          COALESCE(similarity(b.alt_name, v_query), 0.0)
        )
      + 0.1 * (
          log(GREATEST(1.0, COALESCE(b.popularity_score, 0)::float + 100.0))
          / log(1100.0)
        )
    )                                   AS rank_score,
    b.short_id,
    loc.country_code                    AS locality_country_code,
    loc.city_slug                       AS locality_city_slug
  FROM public.buildings b
  LEFT JOIN public.localities loc ON b.locality_id = loc.id
  LEFT JOIN LATERAL (
    SELECT array_agg(DISTINCT COALESCE(p.name, c.name))
           FILTER (WHERE COALESCE(p.name, c.name) IS NOT NULL) AS names
    FROM public.building_credits bc
    LEFT JOIN public.people    p ON p.id = bc.person_id
    LEFT JOIN public.companies c ON c.id = bc.company_id
    WHERE bc.building_id = b.id
      AND bc.status NOT IN ('hidden')
  ) credits_lateral ON true
  WHERE
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND b.location IS NOT NULL
    AND (
      (v_tsquery IS NOT NULL AND b.search_vector @@ v_tsquery)
      OR similarity(b.name, v_query) >= 0.2
      OR COALESCE(similarity(b.alt_name, v_query), 0.0) >= 0.2
    )
    AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
    AND (v_typology_ids IS NULL OR cardinality(v_typology_ids) = 0 OR EXISTS (
      SELECT 1 FROM public.building_functional_typologies bft
      WHERE bft.building_id = b.id AND bft.typology_id = ANY(v_typology_ids)
    ))
    AND (v_attribute_ids IS NULL OR cardinality(v_attribute_ids) = 0 OR EXISTS (
      SELECT 1 FROM public.building_attributes batt
      WHERE batt.building_id = b.id AND batt.attribute_id = ANY(v_attribute_ids)
    ))
    AND public.building_matches_credit_filters(b.id, v_credit_company_id, v_credit_roles)
    AND (v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0
         OR b.status::text = ANY(v_construction_statuses))
    AND (v_size_categories IS NULL OR cardinality(v_size_categories) = 0
         OR b.size_category = ANY(v_size_categories))
    AND (v_min_size_sqm IS NULL OR v_min_size_sqm = 0 OR b.size_sqm >= v_min_size_sqm)
    AND (v_max_size_sqm IS NULL OR b.size_sqm <= v_max_size_sqm)
    AND (v_min_storeys IS NULL OR v_min_storeys <= 1 OR b.storeys >= v_min_storeys)
    AND (v_max_storeys IS NULL OR b.storeys <= v_max_storeys)
    AND (v_award_id IS NULL OR b.id IN (
      SELECT building_id
      FROM public.get_buildings_with_awards(v_award_id, v_award_outcome, v_award_year_from, v_award_year_to)
    ))
    AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0
         OR b.city = ANY(v_cities_filter))
    AND (v_country_filter IS NULL OR b.country = v_country_filter)
    AND (v_year IS NULL OR b.year_completed = v_year)
    AND (
      v_centuries IS NULL
      OR cardinality(v_centuries) = 0
      OR (
        (0 = ANY(v_centuries) AND b.century IS NOT NULL AND b.century < 1)
        OR (b.century IS NOT NULL AND b.century > 0 AND b.century = ANY(v_centuries))
      )
    )
    AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0
         OR b.access_level::text = ANY(v_access_levels))
    AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0
         OR b.access_logistics::text = ANY(v_access_logistics))
    AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0
         OR b.access_cost::text = ANY(v_access_costs))
  ORDER BY rank_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_buildings_v2(text, int, int, jsonb) TO anon, authenticated;

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
  short_id int,
  locality_country_code text,
  locality_city_slug text
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

  v_query text;
  v_cities_filter text[];
  v_country_filter text;
  v_architect_ids uuid[];
  v_category_id uuid;
  v_typology_ids uuid[];
  v_attribute_ids uuid[];
  v_year int;
  v_centuries int[];
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
    IF filter_criteria ? 'centuries' AND jsonb_typeof(filter_criteria->'centuries') = 'array' THEN
      BEGIN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'centuries')::int) INTO v_centuries;
      EXCEPTION WHEN OTHERS THEN v_centuries := NULL;
      END;
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
    b.year_completed, b.city, b.country, b.popularity_score, b.tier_rank::text, b.alt_name,
    b.short_id,
    loc.country_code as locality_country_code,
    loc.city_slug as locality_city_slug
  FROM buildings b
  LEFT JOIN localities loc ON b.locality_id = loc.id
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
    AND (
      v_centuries IS NULL
      OR cardinality(v_centuries) = 0
      OR (
        (0 = ANY(v_centuries) AND b.century IS NOT NULL AND b.century < 1)
        OR (b.century IS NOT NULL AND b.century > 0 AND b.century = ANY(v_centuries))
      )
    )
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

GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, int, int) TO anon;
GRANT EXECUTE ON FUNCTION get_buildings_list(double precision, double precision, double precision, double precision, jsonb, int, int) TO service_role;
