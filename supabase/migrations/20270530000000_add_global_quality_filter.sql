-- Migration to add global quality threshold filter to map clusters
-- Migration ID: 20270530000000_add_global_quality_filter.sql

-- Drop the function first to ensure clean update
DROP FUNCTION IF EXISTS get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb);

CREATE OR REPLACE FUNCTION get_map_clusters_v2(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  zoom_level double precision,
  filter_criteria jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id text,
  lat double precision,
  lng double precision,
  is_cluster boolean,
  count int,
  rating int,
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
  v_status_filter text[];
  v_min_rating int;
  v_personal_min_rating int;
  v_hide_saved boolean;
  v_hide_visited boolean;
  v_ranking_preference text; -- 'global' or 'personal'

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

  v_safe_min_lat := GREATEST(-90.0, min_lat - (v_lat_span * 0.3));
  v_safe_max_lat := LEAST(90.0, max_lat + (v_lat_span * 0.3));
  v_safe_min_lng := GREATEST(-180.0, min_lng - (v_lng_span * 0.3));
  v_safe_max_lng := LEAST(180.0, max_lng + (v_lng_span * 0.3));

  -- 3. Parse Filters
  IF filter_criteria IS NOT NULL THEN
    -- Query Text
    IF filter_criteria ? 'query' AND filter_criteria->>'query' IS NOT NULL THEN
      v_query := filter_criteria->>'query';
    END IF;

    -- Cities
    IF filter_criteria ? 'cities' AND jsonb_typeof(filter_criteria->'cities') = 'array' THEN
        SELECT ARRAY(SELECT jsonb_array_elements_text(filter_criteria->'cities')) INTO v_cities_filter;
    END IF;

    -- Country
    v_country_filter := filter_criteria->>'country';

    -- Architects
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
        WHEN ub.status = 'visited' THEN 'visited'
        WHEN ub.status = 'pending' THEN 'saved'
        ELSE 'none'
      END as mapped_status,
      COALESCE(ub.rating, 0) as mapped_rating
    FROM buildings b
    LEFT JOIN user_buildings ub ON b.id = ub.building_id AND ub.user_id = auth.uid()
    WHERE
      (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
      AND b.location IS NOT NULL
      AND (b.status IS DISTINCT FROM 'Demolished' AND b.status IS DISTINCT FROM 'Unbuilt')
      -- Global Quality Filter: Exclude buildings with popularity score < -50 (community hidden)
      AND (COALESCE(b.popularity_score, 0) >= -50)
      -- Personal Filter: Exclude buildings explicitly ignored by the current user
      AND (ub.status IS DISTINCT FROM 'ignored')
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
      AND (
        v_query IS NULL OR v_query = '' OR
        b.name ILIKE '%' || v_query || '%' OR
        b.address ILIKE '%' || v_query || '%' OR
        EXISTS (
          SELECT 1 FROM building_architects ba
          JOIN architects a ON ba.architect_id = a.id
          WHERE ba.building_id = b.id AND a.name ILIKE '%' || v_query || '%'
        )
        OR
        (LENGTH(v_query) > 2 AND similarity(b.name, v_query) > 0.3)
      )
      -- User Status Filter (Inclusion)
      AND (
        v_status_filter IS NULL OR cardinality(v_status_filter) = 0 OR
        (
          ('visited' = ANY(v_status_filter) AND ub.status = 'visited') OR
          ('saved' = ANY(v_status_filter) AND ub.status = 'pending') OR
          ('none' = ANY(v_status_filter) AND ub.status IS NULL)
        )
      )
      -- Hide Saved / Visited (Exclusion)
      AND (v_hide_saved IS FALSE OR ub.status IS DISTINCT FROM 'pending')
      AND (v_hide_visited IS FALSE OR ub.status IS DISTINCT FROM 'visited')

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
    (count(*) > 1) as is_cluster,
    count(*)::int as count,
    CASE WHEN count(*) = 1 THEN max(fb.mapped_rating) ELSE NULL END as rating,
    CASE WHEN count(*) = 1 THEN max(fb.mapped_status) ELSE NULL END as status,
    CASE WHEN count(*) = 1 THEN max(fb.name) ELSE NULL END as name,
    CASE WHEN count(*) = 1 THEN max(fb.slug) ELSE NULL END as slug,
    CASE WHEN count(*) = 1 THEN max(fb.image_url) ELSE NULL END as image_url,
    CASE WHEN count(*) = 1 THEN max(fb.popularity_score) ELSE NULL END as popularity_score,
    CASE WHEN count(*) = 1 THEN max(fb.tier_rank)::text ELSE NULL END as tier_rank,
    -- Max Tier Calculation for Clusters
    CASE
      WHEN count(*) > 1 THEN
        MAX(
          CASE
             WHEN v_ranking_preference = 'personal' THEN
                 -- Personal Only
                 CASE
                    WHEN fb.mapped_rating >= 3 THEN 3
                    WHEN fb.mapped_rating = 2 THEN 2
                    ELSE 1
                 END
             ELSE
                 -- Global (Default) - Mixed
                 GREATEST(
                    CASE
                      WHEN fb.mapped_rating >= 3 THEN 3
                      WHEN fb.mapped_rating = 2 THEN 2
                      ELSE 1
                    END,
                    CASE
                      WHEN fb.tier_rank::text = 'Top 1%' THEN 3
                      WHEN fb.tier_rank::text IN ('Top 5%', 'Top 10%') THEN 2
                      ELSE 1
                    END
                 )
          END
        )::int
      ELSE
         -- Single Pin
         MAX(
            CASE
               WHEN v_ranking_preference = 'personal' THEN
                   -- Personal Only
                   CASE
                      WHEN fb.mapped_rating >= 3 THEN 3
                      WHEN fb.mapped_rating = 2 THEN 2
                      ELSE 1
                   END
               ELSE
                   -- Global (Default) - Mixed
                   GREATEST(
                      CASE
                        WHEN fb.mapped_rating >= 3 THEN 3
                        WHEN fb.mapped_rating = 2 THEN 2
                        ELSE 1
                      END,
                      CASE
                        WHEN fb.tier_rank::text = 'Top 1%' THEN 3
                        WHEN fb.tier_rank::text IN ('Top 5%', 'Top 10%') THEN 2
                        ELSE 1
                      END
                   )
            END
         )::int
    END as max_tier
  FROM filtered_buildings fb
  GROUP BY st_snaptogrid(fb.location::geometry, v_grid_size);
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION get_map_clusters_v2(double precision, double precision, double precision, double precision, double precision, jsonb) TO service_role;
