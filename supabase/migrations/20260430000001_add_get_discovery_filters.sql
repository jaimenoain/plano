CREATE OR REPLACE FUNCTION get_discovery_filters()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cities text[];
  v_styles text[];
BEGIN
  -- Get distinct cities
  SELECT ARRAY(
    SELECT DISTINCT city
    FROM buildings
    WHERE city IS NOT NULL AND city != ''
    ORDER BY city
  ) INTO v_cities;

  -- Get distinct styles (unnesting the array)
  SELECT ARRAY(
    SELECT DISTINCT s
    FROM buildings, unnest(styles) as s
    WHERE s IS NOT NULL AND s != ''
    ORDER BY s
  ) INTO v_styles;

  RETURN jsonb_build_object(
    'cities', COALESCE(v_cities, ARRAY[]::text[]),
    'styles', COALESCE(v_styles, ARRAY[]::text[])
  );
END;
$$;
