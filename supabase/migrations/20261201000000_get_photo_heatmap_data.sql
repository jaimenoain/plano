CREATE OR REPLACE FUNCTION get_photo_heatmap_data()
RETURNS TABLE (lat float, lng float, weight bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ST_Y(b.location::geometry) as lat,
    ST_X(b.location::geometry) as lng,
    COUNT(ri.id) as weight
  FROM
    buildings b
    JOIN user_buildings ub ON b.id = ub.building_id
    JOIN review_images ri ON ub.id = ri.review_id
  WHERE
    b.location IS NOT NULL
  GROUP BY
    b.id, b.location;
END;
$$;
