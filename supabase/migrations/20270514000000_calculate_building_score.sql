-- Migration to add calculate_building_score function
-- This function calculates a popularity score based on user interactions:
-- Base Interest (Rating 0/NULL): 1x (e.g. saves, visits)
-- High Praise (Rating 1): 5x
-- High Praise (Rating 2): 10x
-- High Praise (Rating 3): 20x
-- Excludes interactions marked as 'ignored'.

CREATE OR REPLACE FUNCTION calculate_building_score(building_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_total_score INTEGER := 0;
BEGIN
    -- Calculate score based on user interactions
    SELECT
        COALESCE(SUM(
            CASE
                WHEN rating = 3 THEN 20
                WHEN rating = 2 THEN 10
                WHEN rating = 1 THEN 5
                ELSE 1 -- Base interest for saved/visited but unrated (rating IS NULL)
            END
        ), 0)
    INTO v_total_score
    FROM user_buildings
    WHERE building_id = building_uuid
    AND status != 'ignored';

    -- Update the building's popularity score
    UPDATE buildings
    SET popularity_score = v_total_score
    WHERE id = building_uuid;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION calculate_building_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_building_score(UUID) TO service_role;
