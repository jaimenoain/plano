-- Roadmap Phase 8 Task 8.2 (Update): expand admin merge functions to include awards, events, and localities.
-- Depends on people, companies, localities, building_credits, award_recipients, events.

-- ---------------------------------------------------------------------------
-- Update merge_people: include award_recipients and architect_claims
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_merge_people(
  p_source_person_id uuid,
  p_target_person_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_source_person_id = p_target_person_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'same_id');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = p_source_person_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'source_not_found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.people WHERE id = p_target_person_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'target_not_found');
  END IF;

  -- 1. Building Credits
  UPDATE public.building_credits
  SET person_id = p_target_person_id
  WHERE person_id = p_source_person_id;

  -- 2. Award Recipients
  UPDATE public.award_recipients
  SET recipient_person_id = p_target_person_id
  WHERE recipient_person_id = p_source_person_id;

  -- 3. Award Suggestions
  UPDATE public.award_recipient_suggestions
  SET recipient_person_id = p_target_person_id
  WHERE recipient_person_id = p_source_person_id;

  -- 4. Architect Claims (Verification)
  UPDATE public.architect_claims
  SET architect_id = p_target_person_id
  WHERE architect_id = p_source_person_id;

  -- 5. Person Company Affiliations
  -- Move affiliations, avoid duplicates
  DELETE FROM public.person_company_affiliations pca
  USING public.person_company_affiliations existing
  WHERE pca.person_id = p_source_person_id
    AND existing.company_id = pca.company_id
    AND existing.person_id = p_target_person_id;

  UPDATE public.person_company_affiliations
  SET person_id = p_target_person_id
  WHERE person_id = p_source_person_id;

  -- 6. Profiles verified link
  UPDATE public.profiles
  SET verified_architect_id = p_target_person_id
  WHERE verified_architect_id = p_source_person_id;

  -- 7. Delete Source
  DELETE FROM public.people
  WHERE id = p_source_person_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Update merge_companies: include awards, award_recipients
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_merge_companies(
  p_source_company_id uuid,
  p_target_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_source_company_id = p_target_company_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'same_id');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_source_company_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'source_not_found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_target_company_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'target_not_found');
  END IF;

  -- 1. Building Credits
  UPDATE public.building_credits
  SET company_id = p_target_company_id
  WHERE company_id = p_source_company_id;

  -- 2. Award Recipients
  UPDATE public.award_recipients
  SET recipient_company_id = p_target_company_id
  WHERE recipient_company_id = p_source_company_id;

  -- 3. Award Suggestions
  UPDATE public.award_recipient_suggestions
  SET recipient_company_id = p_target_company_id
  WHERE recipient_company_id = p_source_company_id;

  -- 4. Awards (Administered By)
  UPDATE public.awards
  SET awarding_body_company_id = p_target_company_id
  WHERE awarding_body_company_id = p_source_company_id;

  -- 5. Person Company Affiliations
  DELETE FROM public.person_company_affiliations pca
  USING public.person_company_affiliations existing
  WHERE pca.company_id = p_source_company_id
    AND existing.person_id = pca.person_id
    AND existing.company_id = p_target_company_id;

  UPDATE public.person_company_affiliations
  SET company_id = p_target_company_id
  WHERE company_id = p_source_company_id;

  -- 6. Company Stewards
  INSERT INTO public.company_stewards (company_id, user_id, role, invited_by)
  SELECT
    p_target_company_id,
    cs.user_id,
    cs.role,
    cs.invited_by
  FROM public.company_stewards cs
  WHERE cs.company_id = p_source_company_id
  ON CONFLICT (company_id, user_id) DO UPDATE SET
    role = CASE
      WHEN company_stewards.role = 'owner'::public.company_steward_role
        OR EXCLUDED.role = 'owner'::public.company_steward_role
      THEN 'owner'::public.company_steward_role
      ELSE company_stewards.role
    END,
    invited_by = COALESCE(company_stewards.invited_by, EXCLUDED.invited_by);

  -- 7. Delete Source
  DELETE FROM public.companies
  WHERE id = p_source_company_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- New merge_localities: buildings, events
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_merge_localities(
  p_source_locality_id uuid,
  p_target_locality_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_source_locality_id = p_target_locality_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'same_id');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.localities WHERE id = p_source_locality_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'source_not_found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.localities WHERE id = p_target_locality_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'target_not_found');
  END IF;

  -- 1. Buildings
  UPDATE public.buildings
  SET locality_id = p_target_locality_id
  WHERE locality_id = p_source_locality_id;

  -- 2. Events
  UPDATE public.events
  SET locality_id = p_target_locality_id
  WHERE locality_id = p_source_locality_id;

  -- 3. Delete Source
  DELETE FROM public.localities
  WHERE id = p_source_locality_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.admin_merge_localities(uuid, uuid) IS
  'Admin-only: moves all buildings and events from source locality to target, deletes source locality row.';

GRANT EXECUTE ON FUNCTION public.admin_merge_localities(uuid, uuid) TO authenticated;
