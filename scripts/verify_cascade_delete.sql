-- Verify Cascade Deletion for User Folders
-- Run this script in your Supabase SQL Editor or via psql

-- 1. Create a Test User (or use existing ID)
-- This part is tricky in SQL script if you want to be self-contained and cleanup.
-- Assuming we use a temporary user or an existing one.
-- For the purpose of this script, we will simulate the logic with a transaction that rolls back,
-- but since we can't easily do that across multiple statements if run individually,
-- we'll use a DO block.

DO $$
DECLARE
    v_user_id uuid;
    v_folder_id uuid;
    v_collection_id uuid;
    v_folder_item_count int;
    v_collection_count int;
BEGIN
    -- Create a dummy user for testing (or use auth.uid() if running in context, but better be explicit)
    -- Here we assume we can insert into auth.users, which requires admin privileges.
    -- If not, replace with a known user ID.
    -- For safety, we will TRY to find a user, or create one if possible.
    -- But since we can't easily create auth users in SQL without proper extensions/functions sometimes,
    -- let's create a temporary user in the `profiles` table and just use a random UUID for auth FK if constraints allow?
    -- `user_folders` has FK to `auth.users`. So we MUST use a valid user ID.
    -- We'll pick the first user from auth.users.

    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users. Please create a user first.';
        RETURN;
    END IF;

    RAISE NOTICE 'Using User ID: %', v_user_id;

    -- 2. Create a Collection
    INSERT INTO public.collections (owner_id, name, slug, is_public)
    VALUES (v_user_id, 'Test Collection for Cascade', 'test-cascade-col', false)
    RETURNING id INTO v_collection_id;

    RAISE NOTICE 'Created Collection ID: %', v_collection_id;

    -- 3. Create a Folder
    INSERT INTO public.user_folders (owner_id, name, slug, is_public)
    VALUES (v_user_id, 'Test Folder for Cascade', 'test-cascade-folder', false)
    RETURNING id INTO v_folder_id;

    RAISE NOTICE 'Created Folder ID: %', v_folder_id;

    -- 4. Add Collection to Folder (Create Item)
    INSERT INTO public.user_folder_items (folder_id, collection_id)
    VALUES (v_folder_id, v_collection_id);

    -- Verify Item Exists
    SELECT count(*) INTO v_folder_item_count FROM public.user_folder_items WHERE folder_id = v_folder_id;
    IF v_folder_item_count != 1 THEN
        RAISE EXCEPTION 'Failed to create user_folder_item';
    END IF;
    RAISE NOTICE 'Created user_folder_item link.';

    -- 5. DELETE the Folder
    DELETE FROM public.user_folders WHERE id = v_folder_id;
    RAISE NOTICE 'Deleted Folder ID: %', v_folder_id;

    -- 6. Verify Cascade Deletion
    -- user_folder_items should be gone
    SELECT count(*) INTO v_folder_item_count FROM public.user_folder_items WHERE folder_id = v_folder_id;

    IF v_folder_item_count = 0 THEN
        RAISE NOTICE 'SUCCESS: user_folder_items were automatically deleted.';
    ELSE
        RAISE EXCEPTION 'FAILURE: user_folder_items still exist after folder deletion!';
    END IF;

    -- 7. Verify Collection Integrity
    -- collection should still exist
    SELECT count(*) INTO v_collection_count FROM public.collections WHERE id = v_collection_id;

    IF v_collection_count = 1 THEN
        RAISE NOTICE 'SUCCESS: Collection still exists.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Collection was deleted!';
    END IF;

    -- Cleanup (Delete the collection)
    DELETE FROM public.collections WHERE id = v_collection_id;
    RAISE NOTICE 'Cleanup: Deleted Test Collection.';

END $$;
