-- get_buildings_list: SERP-list <-> map-pin filter parity.
--
-- The /search SERP list (get_buildings_list) previously applied FEWER filters
-- than the map pins (get_map_clusters_v3), so several drawer filters changed the
-- map but not the list. This aligns the list RPC with the cluster RPC:
--   * Building status + "Show lost": parse construction_statuses /
--     exclude_construction_statuses (copied from get_map_clusters_v3) and REPLACE
--     the old hardcoded `status NOT IN ('Demolished','Lost','Unbuilt')` exclusion.
--     A default exclusion (Demolished/Lost/Under Construction/Unbuilt) is applied
--     when the caller sends neither list, matching the map's DEFAULT_EXCLUDED_
--     CONSTRUCTION_STATUSES so old clients stay safe and aligned.
--   * Awards: parse award_id/outcome/year_from/year_to and gate on
--     get_buildings_with_awards (same predicate the map uses).
--   * Hide saved / hide visited: parse hide_saved / hide_visited.
--   * Century B.C.: adopt the map's B.C.-aware clause (0 -> century < 1).
-- Signature (args + RETURNS TABLE) is unchanged — body only.

CREATE OR REPLACE FUNCTION public.get_buildings_list(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  filter_criteria jsonb DEFAULT '{}'::jsonb,
  page integer DEFAULT 1,
  page_size integer DEFAULT 20
)
 RETURNS TABLE(id uuid, name text, slug text, image_url text, lat double precision, lng double precision, rating integer, status text, credit_names text[], year_completed integer, city text, country text, popularity_score integer, tier_rank text, alt_name text, short_id integer, locality_country_code text, locality_city_slug text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  -- Parity additions (mirrors get_map_clusters_v3)
  v_construction_statuses text[];
  v_exclude_construction_statuses text[];
  v_award_id uuid;
  v_award_outcome text;
  v_award_year_from int;
  v_award_year_to int;
  v_hide_saved boolean := false;
  v_hide_visited boolean := false;

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

    -- Construction status (parity with get_map_clusters_v3)
    IF filter_criteria ? 'construction_statuses' AND jsonb_typeof(filter_criteria->'construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'construction_statuses')) INTO v_construction_statuses;
    END IF;
    IF filter_criteria ? 'exclude_construction_statuses' AND jsonb_typeof(filter_criteria->'exclude_construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'exclude_construction_statuses')) INTO v_exclude_construction_statuses;
    END IF;

    -- Awards (parity with get_map_clusters_v3)
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

    -- Personal hide toggles (parity with get_map_clusters_v3)
    v_hide_saved := COALESCE((filter_criteria->>'hide_saved')::boolean, false);
    v_hide_visited := COALESCE((filter_criteria->>'hide_visited')::boolean, false);
  ELSE
    v_min_rating := 0; v_personal_min_rating := 0;
  END IF;

  -- Default construction-status exclusion when the caller sends neither an
  -- inclusion nor an exclusion list. Mirrors the map default
  -- (DEFAULT_EXCLUDED_CONSTRUCTION_STATUSES): non-standing + not-yet-built
  -- buildings are hidden unless the user opts in. Keeps clients that send no
  -- construction params aligned with the map surface.
  IF (v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0)
     AND (v_exclude_construction_statuses IS NULL OR cardinality(v_exclude_construction_statuses) = 0) THEN
    v_exclude_construction_statuses := ARRAY['Demolished','Lost','Under Construction','Unbuilt'];
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
    -- Construction status: parameter-driven (replaces the old hardcoded
    -- Demolished/Lost/Unbuilt exclusion). Both clauses mirror get_map_clusters_v3.
    AND (v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0 OR b.status::text = ANY(v_construction_statuses))
    AND (v_exclude_construction_statuses IS NULL OR cardinality(v_exclude_construction_statuses) = 0 OR b.status IS NULL OR NOT (b.status::text = ANY(v_exclude_construction_statuses)))
    AND ((v_query IS NOT NULL AND trim(v_query) <> '') OR (((v_safe_max_lng - v_safe_min_lng) > 179 AND b.location::geometry && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)) OR ((v_safe_max_lng - v_safe_min_lng) <= 179 AND b.location && st_makeenvelope(v_safe_min_lng, v_safe_min_lat, v_safe_max_lng, v_safe_max_lat, 4326)::geography)))
    AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
    AND (v_country_filter IS NULL OR b.country = v_country_filter)
    AND (v_architect_ids IS NULL OR cardinality(v_architect_ids) = 0 OR EXISTS (SELECT 1 FROM building_credits bc WHERE bc.building_id = b.id AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum AND (bc.person_id = ANY(v_architect_ids) OR bc.company_id = ANY(v_architect_ids))))
    AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
    AND (v_typology_ids IS NULL OR cardinality(v_typology_ids) = 0 OR EXISTS (SELECT 1 FROM building_functional_typologies bft WHERE bft.building_id = b.id AND bft.typology_id = ANY(v_typology_ids)))
    AND (v_attribute_ids IS NULL OR cardinality(v_attribute_ids) = 0 OR EXISTS (SELECT 1 FROM building_attributes batt WHERE batt.building_id = b.id AND batt.attribute_id = ANY(v_attribute_ids)))
    AND (v_year IS NULL OR b.year_completed = v_year)
    -- Century: B.C.-aware (0 -> century < 1), parity with get_map_clusters_v3.
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
    -- Hide saved / hide visited (parity with get_map_clusters_v3)
    AND (v_hide_saved IS FALSE OR ub.status IS DISTINCT FROM 'pending')
    AND (v_hide_visited IS FALSE OR ub.status IS DISTINCT FROM 'visited')
    AND (v_personal_min_rating = 0 OR COALESCE(ub.rating, 0) >= v_personal_min_rating)
    AND (v_min_rating = 0 OR (v_min_rating = 1 AND b.tier_rank::text IN ('Top 20%', 'Top 10%', 'Top 5%', 'Top 1%')) OR (v_min_rating = 2 AND b.tier_rank::text IN ('Top 5%', 'Top 1%')) OR (v_min_rating = 3 AND b.tier_rank::text = 'Top 1%'))
    AND public.building_matches_credit_filters(b.id, v_credit_company_id, v_credit_roles)
    AND (v_size_categories IS NULL OR cardinality(v_size_categories) = 0 OR b.size_category = ANY(v_size_categories))
    AND (v_min_size_sqm IS NULL OR v_min_size_sqm = 0 OR b.size_sqm >= v_min_size_sqm)
    AND (v_max_size_sqm IS NULL OR b.size_sqm <= v_max_size_sqm)
    AND (v_min_storeys IS NULL OR v_min_storeys <= 1 OR b.storeys >= v_min_storeys)
    AND (v_max_storeys IS NULL OR b.storeys <= v_max_storeys)
    -- Awards (parity with get_map_clusters_v3)
    AND (v_award_id IS NULL OR b.id IN (SELECT building_id FROM public.get_buildings_with_awards(v_award_id, v_award_outcome, v_award_year_from, v_award_year_to)))
  ORDER BY COALESCE(ub.rating, 0) DESC, CASE WHEN v_sort_by = 'popularity' THEN b.popularity_score WHEN v_sort_by IS NULL AND (v_query IS NULL OR v_query = '') THEN b.popularity_score ELSE NULL END DESC NULLS LAST, st_distance(b.location::geography, v_center_point) ASC
  LIMIT page_size OFFSET (page - 1) * page_size;
END;
$function$;
