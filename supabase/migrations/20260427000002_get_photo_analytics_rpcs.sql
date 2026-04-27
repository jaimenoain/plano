CREATE OR REPLACE FUNCTION get_photo_coverage_stats()
RETURNS TABLE (
  total_photos             bigint,
  buildings_with_photos    bigint,
  buildings_without_photos bigint,
  total_buildings          bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH photo_counts AS (
    SELECT ub.building_id
    FROM user_buildings ub
    JOIN review_images ri ON ub.id = ri.review_id
    JOIN buildings b ON b.id = ub.building_id
    WHERE b.is_deleted = false
    GROUP BY ub.building_id
  ),
  totals AS (
    SELECT
      (SELECT COALESCE(SUM(cnt), 0) FROM (
        SELECT COUNT(ri.id) AS cnt
        FROM user_buildings ub
        JOIN review_images ri ON ub.id = ri.review_id
        JOIN buildings b ON b.id = ub.building_id
        WHERE b.is_deleted = false
        GROUP BY ub.building_id
      ) sub) AS total_photos,
      COUNT(pc.building_id) AS buildings_with_photos
    FROM photo_counts pc
  ),
  building_count AS (
    SELECT COUNT(*) AS total_buildings
    FROM buildings
    WHERE is_deleted = false
  )
  SELECT
    t.total_photos,
    t.buildings_with_photos,
    bc.total_buildings - t.buildings_with_photos AS buildings_without_photos,
    bc.total_buildings
  FROM totals t
  CROSS JOIN building_count bc;
END;
$$;


CREATE OR REPLACE FUNCTION get_top_photo_buildings(p_limit int DEFAULT 50)
RETURNS TABLE (
  id           uuid,
  name         text,
  slug         text,
  city         text,
  country_code text,
  lat          float,
  lng          float,
  photo_count  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.slug,
    b.city,
    b.country_code,
    ST_Y(b.location::geometry)::float AS lat,
    ST_X(b.location::geometry)::float AS lng,
    COUNT(ri.id)::bigint               AS photo_count
  FROM buildings b
  JOIN user_buildings ub ON b.id = ub.building_id
  JOIN review_images  ri ON ub.id = ri.review_id
  WHERE b.is_deleted  = false
    AND b.location IS NOT NULL
  GROUP BY b.id, b.name, b.slug, b.city, b.country_code, b.location
  ORDER BY photo_count DESC
  LIMIT p_limit;
END;
$$;


CREATE OR REPLACE FUNCTION get_zero_photo_buildings(p_limit int DEFAULT 500)
RETURNS TABLE (
  id           uuid,
  name         text,
  slug         text,
  city         text,
  country_code text,
  lat          float,
  lng          float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.slug,
    b.city,
    b.country_code,
    ST_Y(b.location::geometry)::float AS lat,
    ST_X(b.location::geometry)::float AS lng
  FROM buildings b
  WHERE b.is_deleted       = false
    AND b.location         IS NOT NULL
    AND b.hero_image_url   IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM user_buildings ub
      JOIN review_images ri ON ub.id = ri.review_id
      WHERE ub.building_id = b.id
    )
  ORDER BY b.name ASC
  LIMIT p_limit;
END;
$$;
