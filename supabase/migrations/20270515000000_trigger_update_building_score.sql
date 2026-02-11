-- Migration to add trigger for automatic building score calculation

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_update_building_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM calculate_building_score(OLD.building_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only recalculate if relevant columns changed
        IF (OLD.rating IS DISTINCT FROM NEW.rating) OR
           (OLD.status IS DISTINCT FROM NEW.status) OR
           (OLD.building_id IS DISTINCT FROM NEW.building_id) THEN

            -- If building_id changed, update the old building too
            IF (OLD.building_id IS DISTINCT FROM NEW.building_id) THEN
                PERFORM calculate_building_score(OLD.building_id);
            END IF;

            PERFORM calculate_building_score(NEW.building_id);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        PERFORM calculate_building_score(NEW.building_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_building_score_trigger ON user_buildings;

CREATE TRIGGER update_building_score_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_buildings
FOR EACH ROW
EXECUTE FUNCTION trigger_update_building_score();
