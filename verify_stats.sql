
DO $$
DECLARE
    v_group_id uuid;
    v_stats jsonb;
BEGIN
    -- Find a group with sessions
    SELECT group_id INTO v_group_id
    FROM group_sessions
    LIMIT 1;

    IF v_group_id IS NULL THEN
        RAISE NOTICE 'No groups with sessions found.';
        RETURN;
    END IF;

    -- Update stats to ensure cache is populated (or at least try to)
    PERFORM update_group_stats(v_group_id);

    -- Fetch stats
    SELECT stats_cache INTO v_stats
    FROM groups
    WHERE id = v_group_id;

    RAISE NOTICE 'Stats for group %: %', v_group_id, v_stats;

    -- Check for sessionCount
    IF v_stats ? 'sessionCount' THEN
        RAISE NOTICE 'sessionCount found: %', v_stats->>'sessionCount';
    ELSE
        RAISE NOTICE 'sessionCount NOT found in stats_cache';
    END IF;

END $$;
