-- Refactor search_buildings RPC to support strict architect ID filtering
-- Migration ID: 20260811000000_refactor_search_buildings_architects.sql

-- Drop previous version with strict signature to allow return type change if needed
DROP FUNCTION IF EXISTS search_buildings(text, jsonb, int, jsonb, text, int);

CREATE OR REPLACE FUNCTION search_buildings(
  query_text text DEFAULT NULL,
  location_coordinates jsonb DEFAULT NULL, -- {lat: number, lng: number}
  radius_meters int DEFAULT NULL,
  filters jsonb DEFAULT NULL, -- {cities: text[], country: text, styles: text[], architects: uuid[], category_ids: uuid[], typology_ids: uuid[], attribute_ids: uuid[]}
  sort_by text DEFAULT 'relevance', -- 'distance' or 'relevance'
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
  location_precision location_precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_lat double precision;
  v_lng double precision;
  v_radius int := COALESCE(radius_meters, 50000);

  -- Filters
  v_cities_filter text[];
  v_country_filter text;
  v_styles_filter text[]; -- Names (Legacy)
  v_architect_ids uuid[]; -- UUIDs
  v_category_ids uuid[]; -- UUIDs
  v_typology_ids uuid[]; -- UUIDs
  v_attribute_ids uuid[]; -- UUIDs
BEGIN
  -- 1. Parse Inputs

  -- Location
  IF location_coordinates IS NOT NULL AND location_coordinates ? 'lat' AND location_coordinates ? 'lng' THEN
    v_lat := (location_coordinates->>'lat')::double precision;
    v_lng := (location_coordinates->>'lng')::double precision;
  END IF;

  -- Filters
  IF filters IS NOT NULL THEN
    -- Cities (Text Array)
    IF filters ? 'cities' AND jsonb_typeof(filters->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'cities')) INTO v_cities_filter;
    END IF;

    -- Country (Text)
    v_country_filter := filters->>'country';

    -- Styles (Text Array - Legacy Names)
    IF filters ? 'styles' AND jsonb_typeof(filters->'styles') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'styles')) INTO v_styles_filter;
    END IF;

    -- Architects (UUID Array)
    -- This enables strict filtering by architect IDs
    IF filters ? 'architects' AND jsonb_typeof(filters->'architects') = 'array' THEN
        -- Try to parse as UUIDs.
        BEGIN
            SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'architects')::uuid) INTO v_architect_ids;
        EXCEPTION WHEN OTHERS THEN
            v_architect_ids := NULL;
        END;
    END IF;

    -- Category IDs (UUID Array)
    IF filters ? 'category_ids' AND jsonb_typeof(filters->'category_ids') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'category_ids')::uuid) INTO v_category_ids;
    END IF;
    -- Support singular 'category_id' for backward/client compatibility
    IF v_category_ids IS NULL AND filters ? 'category_id' AND filters->>'category_id' IS NOT NULL THEN
        v_category_ids := ARRAY[(filters->>'category_id')::uuid];
    END IF;

    -- Typology IDs (UUID Array)
    IF filters ? 'typology_ids' AND jsonb_typeof(filters->'typology_ids') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'typology_ids')::uuid) INTO v_typology_ids;
    END IF;

    -- Attribute IDs (UUID Array)
    IF filters ? 'attribute_ids' AND jsonb_typeof(filters->'attribute_ids') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'attribute_ids')::uuid) INTO v_attribute_ids;
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
      r.created_at as signal_date
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
      max(ub.visited_at::timestamp) as signal_date
    FROM user_buildings ub
    WHERE ub.user_id IN (SELECT friend_id FROM friends)
    AND ub.status = 'visited'
    GROUP BY ub.building_id
  ),
  aggregated_social AS (
    SELECT
      ss.building_id,
      sum(ss.score) as total_score,
      (array_agg(ss.context ORDER BY ss.score DESC))[1] as best_context
    FROM social_signals ss
    GROUP BY ss.building_id
  ),
  -- Aggregate Architects for Display and Search (Names)
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
  ),
  -- Aggregate Styles for Display and Search (Names)
  building_styles_agg AS (
    SELECT
        bs.building_id,
        jsonb_agg(
            jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
            ORDER BY s.name
        ) as styles_json,
        array_agg(s.name) as styles_names
    FROM building_styles bs
    JOIN architectural_styles s ON bs.style_id = s.id
    GROUP BY bs.building_id
  )
  SELECT
    b.id,
    b.name,
    b.address,
    st_y(b.location::geometry) as location_lat,
    st_x(b.location::geometry) as location_lng,
    b.city,
    b.country,
    COALESCE(bs_agg.styles_json, '[]'::jsonb) as styles,
    COALESCE(ba_agg.architects_json, '[]'::jsonb) as architects,
    b.year_completed,
    CASE
      WHEN v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
        st_distance(b.location, st_point(v_lng, v_lat)::geography)
      ELSE NULL
    END as distance_meters,
    COALESCE(s.best_context, NULL) as social_context,
    COALESCE(s.total_score, 0)::integer as social_score,
    b.location_precision
  FROM buildings b
  LEFT JOIN aggregated_social s ON b.id = s.building_id
  LEFT JOIN building_architects_agg ba_agg ON b.id = ba_agg.building_id
  LEFT JOIN building_styles_agg bs_agg ON b.id = bs_agg.building_id
  WHERE
    -- 1. City Filter (OR logic within)
    (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
    AND
    -- 2. Country Filter
    (v_country_filter IS NULL OR b.country = v_country_filter)
    AND
    -- 3. Styles Filter (Legacy Text Match - OR logic within)
    (
        v_styles_filter IS NULL
        OR cardinality(v_styles_filter) = 0
        OR (bs_agg.styles_names IS NOT NULL AND bs_agg.styles_names && v_styles_filter)
    )
    AND
    -- 4. Architects Filter (UUID Match - OR logic within)
    -- Strict ID filtering as requested
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
    -- 5. Functional Category Filter (OR logic within)
    (
        v_category_ids IS NULL
        OR cardinality(v_category_ids) = 0
        OR b.functional_category_id = ANY(v_category_ids)
    )
    AND
    -- 6. Typologies Filter (OR logic within)
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
    -- 7. Attributes Filter (OR logic within)
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
    -- 8. Location Radius Filter
    (
      v_lat IS NULL OR v_lng IS NULL OR
      st_dwithin(b.location, st_point(v_lng, v_lat)::geography, v_radius)
    )
    AND
    -- 9. Soft Delete Check
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND
    -- 10. Text Query (Title, Address, Architect Names, Style Names)
    -- 'AND' logic with the above filters
    (
      query_text IS NULL OR query_text = '' OR
      b.name ILIKE '%' || query_text || '%' OR
      b.address ILIKE '%' || query_text || '%' OR
      array_to_string(ba_agg.architects_names, ' ') ILIKE '%' || query_text || '%' OR
      array_to_string(bs_agg.styles_names, ' ') ILIKE '%' || query_text || '%'
      OR
      (LENGTH(query_text) > 2 AND similarity(b.name, query_text) > 0.3)
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
