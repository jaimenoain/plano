-- Authoritative name search: a building a user names by text must be findable.
--
-- Two structural gates in the search RPCs silently hid buildings from EVERY
-- search path, including an exact name query — the "Farnsworth House is missing"
-- report. This migration relaxes them for the text-search surfaces:
--
-- 1. search_buildings_v2 (Find mode, the authoritative typed-search RPC): drop
--    the `b.location IS NOT NULL` gate. Coordinates are needed to draw a map
--    *pin*, never to return a *name-search result*. lat/lng are
--    ST_Y/ST_X(location::geometry) → NULL when location is NULL, which the client
--    already tolerates (BuildingSearchHit.lat/lng are number|null; SearchPage
--    filters null coords before fitting map bounds; the sidebar list renders them
--    fine). A coordinate-less building now lists with no pin instead of vanishing.
--
--    The construction-status gate stays as-is here and keeps honoring whatever
--    the client sends — the client change (buildFindModeFilters) stops shipping
--    the default exclusion in Find mode, so Demolished/Lost/Unbuilt/Under-
--    Construction buildings surface on an explicit name query (their status chip
--    keeps them visually flagged). Explicit Building-status picks and the
--    Show-lost toggle still narrow results in Find mode.
--
-- 2. get_buildings_list (Browse SERP list): remove the SERVER-side default
--    construction-status exclusion so the *client* is the single source of truth
--    (only the client can tell default vs Show-lost vs explicit picks — the
--    server default forced both to be hand-kept in lockstep and drift). The
--    browse list keeps its own `location IS NOT NULL` gate (Browse is map-centric
--    and ORDER BY st_distance needs coordinates; Find mode is the authoritative
--    text surface). Also unify the browse trigram threshold (0.3 → 0.2) with
--    Find mode for fuzzy/typo recall parity.
--
-- Both are WHERE-clause / body-only changes; neither RETURNS TABLE signature
-- changes, so CREATE OR REPLACE suffices (no DROP, no gen-types). Grants are
-- re-asserted to be explicit. Bodies are copied verbatim from
-- 20271170000000 (search_buildings_v2) and 20271174000000 (get_buildings_list)
-- with only the changes described above.
--
-- types-neutral: function-body/WHERE-only CREATE OR REPLACE; both signatures and
-- RETURNS TABLE unchanged, so gen-types is a no-op.

-- ---------------------------------------------------------------------------
-- 1. search_buildings_v2 — drop the location gate
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_buildings_v2(p_query text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_filters jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id uuid, name text, slug text, alt_name text, hero_image_url text, lat double precision, lng double precision, city text, country text, year_completed integer, popularity_score integer, tier_rank text, construction_status text, credit_names text[], rank_score double precision, short_id integer, locality_country_code text, locality_city_slug text)
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
    b.status::text                      AS construction_status,
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
    -- NOTE: no `b.location IS NOT NULL` gate — a name/text search is
    -- authoritative and must surface a building even without coordinates.
    -- lat/lng come back NULL for those rows; the client tolerates it.
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

GRANT EXECUTE ON FUNCTION public.search_buildings_v2(text, integer, integer, jsonb) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. get_buildings_list — drop the server-side default exclusion (client is the
--    single source of truth) and unify the trigram threshold (0.3 → 0.2).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_buildings_list(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  filter_criteria jsonb DEFAULT '{}'::jsonb,
  page integer DEFAULT 1,
  page_size integer DEFAULT 20
)
 RETURNS TABLE(id uuid, name text, slug text, image_url text, lat double precision, lng double precision, rating integer, status text, construction_status text, credit_names text[], year_completed integer, city text, country text, popularity_score integer, tier_rank text, alt_name text, short_id integer, locality_country_code text, locality_city_slug text)
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
  v_construction_statuses text[];
  v_exclude_construction_statuses text[];
  v_award_id uuid;
  v_award_outcome text;
  v_award_year_from int;
  v_award_year_to int;
  v_hide_saved boolean := false;
  v_hide_visited boolean := false;
  v_collections uuid[];
  v_folders uuid[];
  v_rated_by text[];
  v_filter_contacts boolean := false;
  v_contact_min_rating int := 0;

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

    IF filter_criteria ? 'construction_statuses' AND jsonb_typeof(filter_criteria->'construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'construction_statuses')) INTO v_construction_statuses;
    END IF;
    IF filter_criteria ? 'exclude_construction_statuses' AND jsonb_typeof(filter_criteria->'exclude_construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'exclude_construction_statuses')) INTO v_exclude_construction_statuses;
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

    v_hide_saved := COALESCE((filter_criteria->>'hide_saved')::boolean, false);
    v_hide_visited := COALESCE((filter_criteria->>'hide_visited')::boolean, false);

    IF filter_criteria ? 'collections' AND jsonb_typeof(filter_criteria->'collections') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'collections')::uuid) INTO v_collections; EXCEPTION WHEN OTHERS THEN v_collections := NULL; END;
    END IF;
    IF filter_criteria ? 'folders' AND jsonb_typeof(filter_criteria->'folders') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'folders')::uuid) INTO v_folders; EXCEPTION WHEN OTHERS THEN v_folders := NULL; END;
    END IF;
    IF filter_criteria ? 'rated_by' AND jsonb_typeof(filter_criteria->'rated_by') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'rated_by')) INTO v_rated_by;
    END IF;
    v_filter_contacts := COALESCE((filter_criteria->>'filter_contacts')::boolean, false);
    v_contact_min_rating := COALESCE((filter_criteria->>'contact_min_rating')::int, 0);
  ELSE
    v_min_rating := 0; v_personal_min_rating := 0;
  END IF;

  -- NOTE: no server-side default construction-status exclusion. The client is
  -- the single source of truth (only it can distinguish default vs Show-lost vs
  -- explicit picks); browse callers ship the default exclusion themselves.

  RETURN QUERY
  SELECT
    b.id, b.name, b.slug, main_image_url(b) as image_url, st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng,
    COALESCE(ub.rating, 0) as rating,
    CASE WHEN ub.status = 'visited' THEN 'visited' WHEN ub.status = 'pending' THEN 'saved' ELSE 'none' END as status,
    b.status::text as construction_status,
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
    AND (v_query IS NULL OR v_query = '' OR b.name ILIKE '%' || v_query || '%' OR b.alt_name ILIKE '%' || v_query || '%' OR b.address ILIKE '%' || v_query || '%' OR EXISTS (SELECT 1 FROM building_credits bc LEFT JOIN people p ON bc.person_id = p.id LEFT JOIN companies c ON bc.company_id = c.id WHERE bc.building_id = b.id AND bc.status IS DISTINCT FROM 'hidden'::public.credit_status_enum AND COALESCE(p.name, c.name) ILIKE '%' || v_query || '%') OR EXISTS (SELECT 1 FROM unnest(b.aliases) AS a(alias) WHERE alias ILIKE '%' || v_query || '%') OR (LENGTH(v_query) > 2 AND similarity(b.name, v_query) >= 0.2))
    AND (v_status_filter IS NULL OR cardinality(v_status_filter) = 0 OR (('visited' = ANY(v_status_filter) AND ub.status = 'visited') OR ('saved' = ANY(v_status_filter) AND ub.status = 'pending') OR ('none' = ANY(v_status_filter) AND (ub.status IS NULL OR ub.status = 'ignored'))))
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
    AND (v_award_id IS NULL OR b.id IN (SELECT building_id FROM public.get_buildings_with_awards(v_award_id, v_award_outcome, v_award_year_from, v_award_year_to)))
    AND (
      ((v_collections IS NULL OR cardinality(v_collections) = 0) AND (v_folders IS NULL OR cardinality(v_folders) = 0))
      OR b.id IN (SELECT building_id FROM public.get_buildings_in_collections(v_collections, v_folders))
    )
    AND (
      ((v_rated_by IS NULL OR cardinality(v_rated_by) = 0) AND COALESCE(v_filter_contacts, false) = false)
      OR public.building_matches_contact_filters(b.id, v_rated_by, v_filter_contacts, v_contact_min_rating)
    )
  ORDER BY COALESCE(ub.rating, 0) DESC, CASE WHEN v_sort_by = 'popularity' THEN b.popularity_score WHEN v_sort_by IS NULL AND (v_query IS NULL OR v_query = '') THEN b.popularity_score ELSE NULL END DESC NULLS LAST, st_distance(b.location::geography, v_center_point) ASC, b.id ASC
  LIMIT page_size OFFSET (page - 1) * page_size;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_buildings_list(double precision, double precision, double precision, double precision, jsonb, integer, integer) TO anon, authenticated, service_role;
