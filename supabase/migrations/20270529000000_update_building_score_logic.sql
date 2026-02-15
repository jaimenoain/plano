-- Migration to update calculate_building_score logic for community moderation
-- Changes:
-- 1. Include 'ignored' status in calculation with a negative weight (-10).
-- 2. Maintain existing positive weights (Rating 3=+20, 2=+10, 1=+5, Base=+1).
-- 3. Recalculate all scores and tiers immediately.

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
                WHEN status = 'ignored' THEN -10
                WHEN rating = 3 THEN 20
                WHEN rating = 2 THEN 10
                WHEN rating = 1 THEN 5
                ELSE 1 -- Base interest for saved/visited but unrated (rating IS NULL)
            END
        ), 0)
    INTO v_total_score
    FROM user_buildings
    WHERE building_id = building_uuid;

    -- Update the building's popularity score
    UPDATE buildings
    SET popularity_score = v_total_score
    WHERE id = building_uuid;
END;
$$;

-- Bulk update all buildings to reflect the new logic immediately
UPDATE buildings b
SET popularity_score = (
    SELECT COALESCE(SUM(
        CASE
            WHEN ub.status = 'ignored' THEN -10
            WHEN ub.rating = 3 THEN 20
            WHEN ub.rating = 2 THEN 10
            WHEN ub.rating = 1 THEN 5
            ELSE 1
        END
    ), 0)
    FROM user_buildings ub
    WHERE ub.building_id = b.id
);

-- Recalculate tiers based on new scores
SELECT update_building_tiers();
