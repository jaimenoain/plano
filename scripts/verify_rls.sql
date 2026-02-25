-- Verify RLS for User Folders
-- Run this script in your Supabase SQL Editor or via psql

DO $$
DECLARE
    v_user_1 uuid;
    v_user_2 uuid;
    v_folder_id uuid;
    v_count int;
BEGIN
    -- 1. Identify/Create Two Users
    -- Assuming we have at least 2 users in auth.users
    SELECT id INTO v_user_1 FROM auth.users ORDER BY created_at LIMIT 1;
    SELECT id INTO v_user_2 FROM auth.users ORDER BY created_at DESC LIMIT 1;

    IF v_user_1 IS NULL OR v_user_2 IS NULL OR v_user_1 = v_user_2 THEN
        RAISE NOTICE 'Need at least two distinct users to verify RLS.';
        RETURN;
    END IF;

    RAISE NOTICE 'User 1 (Owner): %', v_user_1;
    RAISE NOTICE 'User 2 (Visitor): %', v_user_2;

    -- 2. Create a PRIVATE Folder as User 1
    -- We must impersonate User 1 or just insert as admin (RLS bypassed for admin usually, but here we insert data)
    -- If we are admin, we can insert for any user.
    INSERT INTO public.user_folders (owner_id, name, slug, is_public)
    VALUES (v_user_1, 'Private Folder RLS Test', 'private-rls-test', false)
    RETURNING id INTO v_folder_id;

    RAISE NOTICE 'Created Private Folder ID: %', v_folder_id;

    -- 3. Verify User 2 CANNOT see it
    -- To test RLS in a script, we often need to set the current role/user.
    -- Supabase specific: set request.jwt.claim.sub to v_user_2

    -- NOTE: SET LOCAL is transaction scoped.
    -- We can verify RLS by switching role to 'authenticated' and setting configuration parameter.

    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_2::text, true);

    SELECT count(*) INTO v_count FROM public.user_folders WHERE id = v_folder_id;

    IF v_count = 0 THEN
        RAISE NOTICE 'SUCCESS: User 2 cannot see the private folder.';
    ELSE
        RAISE EXCEPTION 'FAILURE: User 2 CAN see the private folder! Count: %', v_count;
    END IF;

    -- 4. Verify User 1 CAN see it
    PERFORM set_config('request.jwt.claim.sub', v_user_1::text, true);

    SELECT count(*) INTO v_count FROM public.user_folders WHERE id = v_folder_id;

    IF v_count = 1 THEN
        RAISE NOTICE 'SUCCESS: User 1 can see their own private folder.';
    ELSE
        RAISE EXCEPTION 'FAILURE: User 1 CANNOT see their own private folder!';
    END IF;

    -- Cleanup (As Admin/Service Role)
    -- Reset role to service_role or similar to delete
    PERFORM set_config('role', 'service_role', true);

    DELETE FROM public.user_folders WHERE id = v_folder_id;
    RAISE NOTICE 'Cleanup: Deleted Test Folder.';

END $$;
