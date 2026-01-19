DO $$
DECLARE
    v_group_id uuid;
BEGIN
    -- Get a valid group ID.
    SELECT id INTO v_group_id FROM groups LIMIT 1;

    IF v_group_id IS NOT NULL THEN
        RAISE NOTICE 'Testing update_group_stats with group_id: %', v_group_id;
        PERFORM update_group_stats(v_group_id);
        RAISE NOTICE 'Success! update_group_stats finished without error.';
    ELSE
        RAISE NOTICE 'No groups found to test.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to update group stats: %', SQLERRM;
END $$;
