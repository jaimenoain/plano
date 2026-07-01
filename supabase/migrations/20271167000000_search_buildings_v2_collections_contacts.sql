-- search_buildings_v2 (Find mode): wire Folders/Collections and Curators &
-- friends via the shared helpers so the text-search surface honors the same
-- filters as Browse. Guarded no-op when unset. Builds on the Slice-2 version.

CREATE OR REPLACE FUNCTION public.search_buildings_v2(p_query text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_filters jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, name text, slug text, alt_name text, hero_image_url text, lat double precision, lng double precision, city text, country text, year_completed integer, popularity_score integer, tier_rank text, credit_names text[], rank_score double precision, short_id integer, locality_country_code text, locality_city_slug text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_query               text;
  v_tsquery             tsquery;
  v_category_id         uuid;
  v_typology_ids        uuid[];
  v_attribute_ids       uuid[];
  v_credit_company_id   uuid;
  v_credit_roles        text[];
  v_construction_statuses text[];
  v_exclude_construction_statuses text[];
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
  v_collections         uuid[];
  v_folders             uuid[];
  v_rated_by            text[];
  v_filter_contacts     boolean := false;
  v_contact_min_rating  int := 0;
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
    IF p_filters ? 'exclude_construction_statuses' AND jsonb_typeof(p_filters->'exclude_construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'exclude_construction_statuses')) INTO v_exclude_construction_statuses;
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
    IF p_filters ? 'collections' AND jsonb_typeof(p_filters->'collections') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'collections')::uuid) INTO v_collections; EXCEPTION WHEN OTHERS THEN v_collections := NULL; END;
    END IF;
    IF p_filters ? 'folders' AND jsonb_typeof(p_filters->'folders') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'folders')::uuid) INTO v_folders; EXCEPTION WHEN OTHERS THEN v_folders := NULL; END;
    END IF;
    IF p_filters ? 'rated_by' AND jsonb_typeof(p_filters->'rated_by') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'rated_by')) INTO v_rated_by;
    END IF;
    v_filter_contacts := COALESCE((p_filters->>'filter_contacts')::boolean, false);
    v_contact_min_rating := COALESCE((p_filters->>'contact_min_rating')::int, 0);
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
    AND (v_exclude_construction_statuses IS NULL OR cardinality(v_exclude_construction_statuses) = 0
         OR b.status IS NULL OR NOT (b.status::text = ANY(v_exclude_construction_statuses)))
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
    AND (v_centuries IS NULL OR cardinality(v_centuries) = 0
         OR ((0 = ANY(v_centuries) AND b.century IS NOT NULL AND b.century < 1)
             OR (b.century IS NOT NULL AND b.century > 0 AND b.century = ANY(v_centuries))))
    AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0
         OR b.access_level::text = ANY(v_access_levels))
    AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0
         OR b.access_logistics::text = ANY(v_access_logistics))
    AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0
         OR b.access_cost::text = ANY(v_access_costs))
    AND (
      ((v_collections IS NULL OR cardinality(v_collections) = 0) AND (v_folders IS NULL OR cardinality(v_folders) = 0))
      OR b.id IN (SELECT building_id FROM public.get_buildings_in_collections(v_collections, v_folders))
    )
    AND (
      ((v_rated_by IS NULL OR cardinality(v_rated_by) = 0) AND COALESCE(v_filter_contacts, false) = false)
      OR public.building_matches_contact_filters(b.id, v_rated_by, v_filter_contacts, v_contact_min_rating)
    )
  ORDER BY rank_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
