
-- Verification script for Sparkline Logic
-- Should confirm that films NOT in any session are EXCLUDED from ranking_data
-- And films IN a session are INCLUDED.

DO $$
DECLARE
    v_group_id uuid;
    v_user_id uuid;
    v_session_id uuid;
    -- Use fixed UUIDs for idempotency and type correctness
    v_film_in_session uuid := '00000000-0000-0000-0000-000000000001';
    v_film_not_in_session uuid := '00000000-0000-0000-0000-000000000002';
    v_stats jsonb;
    v_ranking_data jsonb;
    v_found_in boolean;
    v_found_out boolean;
BEGIN
    RAISE NOTICE 'Starting verification...';

    -- 1. Setup Data

    -- Get or Create dummy user
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'verifier@example.com';

    IF v_user_id IS NULL THEN
        -- Insert with metadata to trigger profile creation
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (gen_random_uuid(), 'verifier@example.com', '{"username": "verifier"}'::jsonb)
        RETURNING id INTO v_user_id;
    END IF;

    -- Note: We rely on the `on_auth_user_created` trigger to create the profile.
    -- If the profile doesn't exist for some reason (e.g. trigger disabled), we insert it safely.
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
        INSERT INTO profiles (id, username) VALUES (v_user_id, 'verifier')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Create dummy group (or get if exists)
    SELECT id INTO v_group_id FROM groups WHERE slug = 'sparkline-group';
    IF v_group_id IS NULL THEN
        -- Fix: Use created_by instead of admin_id
        INSERT INTO groups (name, slug, created_by) VALUES ('Sparkline Group', 'sparkline-group', v_user_id) RETURNING id INTO v_group_id;
    END IF;

    -- Ensure member
    INSERT INTO group_members (group_id, user_id, status, role) VALUES (v_group_id, v_user_id, 'active', 'admin')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- Create films (mock)
    INSERT INTO films (id, title, tmdb_id) VALUES (v_film_in_session, 'Session Film', 101) ON CONFLICT (id) DO NOTHING;
    INSERT INTO films (id, title, tmdb_id) VALUES (v_film_not_in_session, 'Non-Session Film', 102) ON CONFLICT (id) DO NOTHING;

    -- Create session (Always create a new one to ensure clean state for this run)
    INSERT INTO group_sessions (group_id, title, session_date) VALUES (v_group_id, 'Test Session', now()) RETURNING id INTO v_session_id;

    -- Add film to session
    INSERT INTO session_films (session_id, film_id, is_main) VALUES (v_session_id, v_film_in_session, true);

    -- Add logs (ratings) for both films
    -- Since we might run this multiple times, just inserting is fine as update_group_stats picks the latest.
    INSERT INTO log (user_id, film_id, rating, watched_at) VALUES (v_user_id, v_film_in_session, 8.0, now());
    INSERT INTO log (user_id, film_id, rating, watched_at) VALUES (v_user_id, v_film_not_in_session, 5.0, now());

    -- 2. Execute update_group_stats
    PERFORM update_group_stats(v_group_id);

    -- 3. Check Results
    SELECT stats_cache INTO v_stats FROM groups WHERE id = v_group_id;
    v_ranking_data := v_stats->'ranking_data';

    -- Check if film_in_session is present
    -- Cast UUID to text for comparison with JSONB values
    SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_ranking_data) elem
        WHERE elem->>'film_id' = v_film_in_session::text
    ) INTO v_found_in;

    -- Check if film_not_in_session is present
    SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_ranking_data) elem
        WHERE elem->>'film_id' = v_film_not_in_session::text
    ) INTO v_found_out;

    RAISE NOTICE 'Ranking Data: %', v_ranking_data;

    -- Cleanup test session to keep DB somewhat clean
    DELETE FROM group_sessions WHERE id = v_session_id;

    IF v_found_in AND NOT v_found_out THEN
        RAISE NOTICE 'SUCCESS: Only session films are in ranking data.';
    ELSE
        RAISE EXCEPTION 'FAILURE: ranking_data incorrect. Found In-Session: %, Found Out-Session: %', v_found_in, v_found_out;
    END IF;

END $$;
