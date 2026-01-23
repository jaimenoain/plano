-- Create function to get building leaderboards
CREATE OR REPLACE FUNCTION get_building_leaderboards()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    most_visited JSON;
    top_rated JSON;
BEGIN
    -- Most Visited: Count of users who marked as visited
    SELECT json_agg(t) INTO most_visited
    FROM (
        SELECT
            b.id,
            b.name,
            b.city,
            b.country,
            b.main_image_url,
            COUNT(ub.id) as visit_count
        FROM buildings b
        JOIN user_buildings ub ON b.id = ub.building_id
        WHERE ub.status = 'visited'
        GROUP BY b.id
        ORDER BY visit_count DESC
        LIMIT 10
    ) t;

    -- Top Rated: Average rating, min 3 votes
    SELECT json_agg(t) INTO top_rated
    FROM (
        SELECT
            b.id,
            b.name,
            b.city,
            b.country,
            b.main_image_url,
            AVG(ub.rating)::numeric(10,1) as avg_rating,
            COUNT(ub.id) as rating_count
        FROM buildings b
        JOIN user_buildings ub ON b.id = ub.building_id
        WHERE ub.rating IS NOT NULL
        GROUP BY b.id
        HAVING COUNT(ub.id) >= 3
        ORDER BY avg_rating DESC, rating_count DESC
        LIMIT 10
    ) t;

    RETURN json_build_object(
        'most_visited', COALESCE(most_visited, '[]'::json),
        'top_rated', COALESCE(top_rated, '[]'::json)
    );
END;
$$;
