-- Five-rank map tiers: align the DB with the redesigned pin/cluster visual code.
--
-- 1. update_building_tiers(): the 4th percentile band moves from Top 25% to
--    Top 20% (the map's global code is Top 1% / 5% / 10% / 20% / Rest). The
--    'Top 25%' enum value stays in building_tier_rank but is no longer
--    assigned.
-- 2. get_map_clusters_v3: max_tier becomes a strictly mode-separated 1–5 rank
--    (previously personal capped at 3 and global mixed rating+tier via
--    GREATEST up to 4 — which the client rendered as the *quietest* face).
--    A cluster wears a rank's face iff it contains ≥1 building of that rank.
--    Also returns `rating` for un-clustered points so the client can render
--    the personal code and the discover-mode saved mark.
-- 3. Re-run the tiering once so no rows carry 'Top 25%'.

-- ---------------------------------------------------------------------------
-- 1. Tier quotas: 1% / 5% / 10% / 20%
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_building_tiers()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    total_buildings INTEGER;
    tier_1_cutoff INTEGER;
    tier_2_cutoff INTEGER;
    tier_3_cutoff INTEGER;
    tier_4_cutoff INTEGER;
BEGIN
    -- Calculate total count of active buildings
    SELECT COUNT(*) INTO total_buildings
    FROM public.buildings
    WHERE is_deleted IS FALSE OR is_deleted IS NULL;

    -- If there are no active buildings, exit early
    IF total_buildings = 0 THEN
        RETURN;
    END IF;

    -- Calculate strict capacity cut-offs based on the total active buildings
    tier_1_cutoff := CEIL(total_buildings * 0.01);
    tier_2_cutoff := CEIL(total_buildings * 0.05);
    tier_3_cutoff := CEIL(total_buildings * 0.10);
    tier_4_cutoff := CEIL(total_buildings * 0.20); -- Top 20% cumulative (was 25%)

    WITH photo_counts AS (
        -- Aggregate photo counts per building to avoid massive joins later
        SELECT
            ub.building_id,
            COUNT(ri.id) as count
        FROM
            public.user_buildings ub
        JOIN
            public.review_images ri ON ub.id = ri.review_id
        GROUP BY
            ub.building_id
    ),
    ranked_buildings AS (
        SELECT
            b.id,
            b.popularity_score,
            ROW_NUMBER() OVER (
                ORDER BY
                    b.popularity_score DESC,
                    COALESCE(pc.count, 0) DESC,
                    b.created_at DESC
            ) as row_num
        FROM
            public.buildings b
        LEFT JOIN
            photo_counts pc ON b.id = pc.building_id
        WHERE
            b.is_deleted IS FALSE OR b.is_deleted IS NULL
    ),
    final_tiers AS (
        SELECT
            rb.id,
            CASE
                WHEN rb.row_num <= tier_1_cutoff THEN 'Top 1%'::public.building_tier_rank
                WHEN rb.row_num <= tier_2_cutoff THEN 'Top 5%'::public.building_tier_rank
                WHEN rb.row_num <= tier_3_cutoff THEN 'Top 10%'::public.building_tier_rank
                WHEN rb.row_num <= tier_4_cutoff THEN 'Top 20%'::public.building_tier_rank
                ELSE 'Standard'::public.building_tier_rank
            END as new_tier
        FROM ranked_buildings rb
    )
    UPDATE public.buildings b
    SET tier_rank = ft.new_tier
    FROM final_tiers ft
    WHERE b.id = ft.id
    AND b.tier_rank IS DISTINCT FROM ft.new_tier;

    -- Optionally, also handle deleted buildings by setting them to 'Standard'
    -- if they aren't already, although typically queries filter them out anyway.
    UPDATE public.buildings
    SET tier_rank = 'Standard'::public.building_tier_rank
    WHERE (is_deleted IS TRUE)
    AND tier_rank IS DISTINCT FROM 'Standard'::public.building_tier_rank;

END;
$$;

-- ---------------------------------------------------------------------------
-- 2. get_map_clusters_v3: add per-point `rating`, emit max_tier 1–5
-- ---------------------------------------------------------------------------
-- Adding a column to a RETURNS TABLE function changes its return type, which
-- CREATE OR REPLACE cannot do — drop first, then recreate. PUBLIC keeps EXECUTE
-- by default; grants are re-asserted below to be explicit.
DROP FUNCTION IF EXISTS public.get_map_clusters_v3(double precision, double precision, double precision, double precision, double precision, jsonb);

CREATE OR REPLACE FUNCTION public.get_map_clusters_v3(min_lat double precision, max_lat double precision, min_lng double precision, max_lng double precision, zoom_level double precision, filter_criteria jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id text, lat double precision, lng double precision, count bigint, is_cluster boolean, status text, construction_status text, name text, slug text, image_url text, popularity_score integer, tier_rank text, rating integer, max_tier integer, winner_award_name text, photos_count integer, city text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  v_exclude_construction_statuses text[];
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
  v_collections uuid[];
  v_folders uuid[];
  v_rated_by text[];
  v_filter_contacts boolean := false;
  v_contact_min_rating int := 0;

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
    IF filter_criteria ? 'exclude_construction_statuses' AND jsonb_typeof(filter_criteria->'exclude_construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'exclude_construction_statuses')) INTO v_exclude_construction_statuses;
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
      b.status::text as construction_status,
      CASE WHEN ub.status::text = 'visited' THEN 'visited' WHEN ub.status::text = 'pending' THEN 'saved' ELSE 'none' END as mapped_status,
      COALESCE(ub.rating, 0) as mapped_rating,
      w.award_name as winner_award_name,
      COALESCE(pc.photos_count, 0)::int as photos_count,
      b.city
    FROM buildings b
    LEFT JOIN user_buildings ub ON b.id = ub.building_id AND ub.user_id = auth.uid()
    LEFT JOIN (
      SELECT bp.building_id, COUNT(ri.id)::int as photos_count
      FROM building_posts bp
      JOIN review_images ri ON ri.review_id = bp.id
      WHERE COALESCE(bp.visibility, 'public') = 'public'
      GROUP BY bp.building_id
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
      AND (v_exclude_construction_statuses IS NULL OR cardinality(v_exclude_construction_statuses) = 0 OR b.status IS NULL OR NOT (b.status::text = ANY(v_exclude_construction_statuses)))
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
      AND (
        (v_credit_company_id IS NULL AND (v_credit_roles IS NULL OR cardinality(v_credit_roles) = 0))
        OR public.building_matches_credit_filters(b.id, v_credit_company_id, v_credit_roles)
      )
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
    CASE WHEN count(*) = 1 THEN max(fb.construction_status) ELSE NULL END as construction_status,
    CASE WHEN count(*) = 1 THEN max(fb.name) ELSE NULL END as name,
    CASE WHEN count(*) = 1 THEN max(fb.slug) ELSE NULL END as slug,
    CASE WHEN count(*) = 1 THEN max(fb.image_url) ELSE NULL END as image_url,
    CASE WHEN count(*) = 1 THEN max(fb.popularity_score) ELSE NULL END as popularity_score,
    CASE WHEN count(*) = 1 THEN max(fb.tier_rank)::text ELSE NULL END as tier_rank,
    CASE WHEN count(*) = 1 THEN max(fb.mapped_rating)::int ELSE NULL END as rating,
    -- max_tier: best ladder rank (1–5) among the cluster's buildings, strictly
    -- mode-separated. Personal: 3/2/1 pts → 5/4/3, saved/visited unrated → 2,
    -- unsaved → 1. Global: percentile bands ('Top 25%' tolerated until the
    -- re-tier below retires it).
    CASE WHEN count(*) > 1 THEN MAX(
      CASE WHEN v_ranking_preference = 'personal' THEN
        CASE WHEN fb.mapped_rating >= 3 THEN 5
             WHEN fb.mapped_rating = 2 THEN 4
             WHEN fb.mapped_rating = 1 THEN 3
             WHEN fb.mapped_status IN ('saved', 'visited') THEN 2
             ELSE 1 END
      ELSE
        CASE WHEN fb.tier_rank::text = 'Top 1%' THEN 5
             WHEN fb.tier_rank::text = 'Top 5%' THEN 4
             WHEN fb.tier_rank::text = 'Top 10%' THEN 3
             WHEN fb.tier_rank::text IN ('Top 20%', 'Top 25%') THEN 2
             ELSE 1 END
      END)::int ELSE NULL END as max_tier,
    CASE WHEN count(*) = 1 THEN max(fb.winner_award_name) ELSE NULL END as winner_award_name,
    CASE WHEN count(*) = 1 THEN max(fb.photos_count) ELSE NULL END as photos_count,
    max(fb.city) as city
  FROM filtered_buildings fb
  GROUP BY st_snaptogrid(fb.location::geometry, v_grid_size);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_map_clusters_v3(double precision, double precision, double precision, double precision, double precision, jsonb) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Re-run tiering once so no rows carry 'Top 25%'
-- ---------------------------------------------------------------------------
SELECT update_building_tiers();
