DO $$
DECLARE
    r RECORD;
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting calculation of building scores...';

    FOR r IN SELECT id FROM buildings LOOP
        PERFORM calculate_building_score(r.id);
        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Calculated scores for % buildings.', v_count;

    RAISE NOTICE 'Updating building tiers...';
    PERFORM update_building_tiers();
    RAISE NOTICE 'Building tiers updated successfully.';
END $$;
