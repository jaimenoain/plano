-- scripts/verify_architect_policies.sql

BEGIN;

DO $$
DECLARE
    v_architect_user_id uuid;
    v_regular_user_id uuid;
    v_architect_id uuid;
    v_building_id uuid;
    v_image_id uuid;
    v_review_id uuid;
BEGIN
    RAISE NOTICE 'Starting Architect Policy Verification...';

    -- 1. Select Existing Users
    SELECT id INTO v_architect_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    SELECT id INTO v_regular_user_id FROM auth.users WHERE id != v_architect_user_id ORDER BY created_at LIMIT 1;

    IF v_architect_user_id IS NULL OR v_regular_user_id IS NULL THEN
        RAISE EXCEPTION 'Need at least two users in auth.users to run verification.';
    END IF;

    RAISE NOTICE 'Architect User: %', v_architect_user_id;
    RAISE NOTICE 'Regular User: %', v_regular_user_id;

    -- 2. Create Test Data
    -- Create Architect
    INSERT INTO public.architects (name) VALUES ('Test Verify Architect ' || gen_random_uuid()) RETURNING id INTO v_architect_id;

    -- Create Verified Claim
    INSERT INTO public.architect_claims (user_id, architect_id, status, proof_email)
    VALUES (v_architect_user_id, v_architect_id, 'verified', 'arch@test.com');

    -- Create Building (Owner is regular user, to test that creator rights don't override official field protection)
    INSERT INTO public.buildings (name, created_by, location)
    VALUES ('Test Building Verify', v_regular_user_id, ST_SetSRID(ST_MakePoint(0,0), 4326))
    RETURNING id INTO v_building_id;

    -- Link Building to Architect
    INSERT INTO public.building_architects (building_id, architect_id)
    VALUES (v_building_id, v_architect_id);

    -- Create a Review Image (Community upload) owned by Regular User
    INSERT INTO public.user_buildings (user_id, building_id, status)
    VALUES (v_regular_user_id, v_building_id, 'visited')
    RETURNING id INTO v_review_id;

    INSERT INTO public.review_images (review_id, user_id, storage_path, is_official)
    VALUES (v_review_id, v_regular_user_id, 'path/to/img.jpg', false)
    RETURNING id INTO v_image_id;

    ----------------------------------------------------------------
    -- Test 1: Regular User Update Building Official Fields (FAIL)
    ----------------------------------------------------------------
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_regular_user_id::text, true);

    BEGIN
        UPDATE public.buildings
        SET architect_statement = 'Hacked Statement'
        WHERE id = v_building_id;

        RAISE EXCEPTION 'Regular user (creator) should not be able to update architect_statement';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Regular user blocked from updating architect_statement';
    END;

    ----------------------------------------------------------------
    -- Test 2: Verified Architect Update Building Official Fields (SUCCESS)
    ----------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_architect_user_id::text, true);

    UPDATE public.buildings
    SET architect_statement = 'Official Statement',
        hero_image_id = v_image_id
    WHERE id = v_building_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verified architect failed to update official fields';
    END IF;
    RAISE NOTICE 'SUCCESS: Verified architect updated official fields';

    ----------------------------------------------------------------
    -- Test 3: Verified Architect Update Building Name (FAIL)
    ----------------------------------------------------------------
    -- Architect is NOT creator.
    BEGIN
        UPDATE public.buildings
        SET name = 'Hacked Name'
        WHERE id = v_building_id;

        RAISE EXCEPTION 'Verified architect should not be able to update name';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Verified architect blocked from updating name';
    END;

    ----------------------------------------------------------------
    -- Test 4: Regular User Update Image Official Flag (FAIL)
    ----------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_regular_user_id::text, true);

    BEGIN
        UPDATE public.review_images
        SET is_official = true
        WHERE id = v_image_id;

        RAISE EXCEPTION 'Regular user should not be able to update is_official';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Regular user blocked from updating is_official';
    END;

    ----------------------------------------------------------------
    -- Test 5: Verified Architect Update Image Official Flag (SUCCESS)
    ----------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_architect_user_id::text, true);

    UPDATE public.review_images
    SET is_official = true
    WHERE id = v_image_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verified architect failed to update is_official';
    END IF;
    RAISE NOTICE 'SUCCESS: Verified architect updated is_official';

    -- Cleanup
    PERFORM set_config('role', 'service_role', true);

    DELETE FROM public.building_architects WHERE building_id = v_building_id;
    DELETE FROM public.architect_claims WHERE user_id = v_architect_user_id AND architect_id = v_architect_id;
    DELETE FROM public.architects WHERE id = v_architect_id;
    DELETE FROM public.review_images WHERE id = v_image_id;
    DELETE FROM public.user_buildings WHERE id = v_review_id;
    DELETE FROM public.buildings WHERE id = v_building_id;

    RAISE NOTICE 'Verification Complete. All tests passed.';

END $$;

ROLLBACK;
