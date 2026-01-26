-- Update search_buildings RPC to accept a limit parameter

-- Drop the old function signature
DROP FUNCTION IF EXISTS search_buildings(text, jsonb, int, jsonb, text);

CREATE OR REPLACE FUNCTION search_buildings(
  query_text text DEFAULT NULL,
  location_coordinates jsonb DEFAULT NULL, -- {lat: number, lng: number}
  radius_meters int DEFAULT NULL,
  filters jsonb DEFAULT NULL, -- {cities: text[], country: text, styles: text[]}
  sort_by text DEFAULT 'relevance', -- 'distance' or 'relevance'
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  main_image_url text,
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
  v_cities_filter text[];
  v_country_filter text;
  v_styles_filter text[];
BEGIN
  -- Parse inputs
  IF location_coordinates IS NOT NULL AND location_coordinates ? 'lat' AND location_coordinates ? 'lng' THEN
    v_lat := (location_coordinates->>'lat')::double precision;
    v_lng := (location_coordinates->>'lng')::double precision;
  END IF;

  IF filters IS NOT NULL THEN
    IF filters ? 'cities' AND jsonb_typeof(filters->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'cities')) INTO v_cities_filter;
    END IF;

    v_country_filter := filters->>'country';

    IF filters ? 'styles' AND jsonb_typeof(filters->'styles') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filters->'styles')) INTO v_styles_filter;
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
  -- Aggregate Architects
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
  -- Aggregate Styles
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
    main_image_url(b) as main_image_url, -- Use computed column function
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
    (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0 OR b.city = ANY(v_cities_filter))
    AND
    (v_country_filter IS NULL OR b.country = v_country_filter)
    AND
    (
        v_styles_filter IS NULL
        OR cardinality(v_styles_filter) = 0
        OR (bs_agg.styles_names IS NOT NULL AND bs_agg.styles_names && v_styles_filter)
    )
    AND
    (
      v_lat IS NULL OR v_lng IS NULL OR
      st_dwithin(b.location, st_point(v_lng, v_lat)::geography, v_radius)
    )
    AND
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND
    (
      query_text IS NULL OR query_text = '' OR
      b.name ILIKE '%' || query_text || '%' OR
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
