-- Roadmap Phase 8 Task 8.2: admin merge duplicate people / companies (credits + related rows).
-- Apply via Supabase SQL Editor. Depends on people, companies, building_credits, person_company_affiliations, company_stewards.

-- ---------------------------------------------------------------------------
-- Merge people: re-point credits, drop affiliations for source, delete source row
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

  UPDATE public.building_credits
  SET person_id = p_target_person_id
  WHERE person_id = p_source_person_id;

  DELETE FROM public.person_company_affiliations
  WHERE person_id = p_source_person_id;

  DELETE FROM public.people
  WHERE id = p_source_person_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.admin_merge_people(uuid, uuid) IS
  'Admin-only: moves all building_credits from source person to target, removes source affiliations, deletes source people row.';

REVOKE ALL ON FUNCTION public.admin_merge_people(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_merge_people(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Merge companies: credits, affiliations, stewards; delete source company (CASCADE)
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

  UPDATE public.building_credits
  SET company_id = p_target_company_id
  WHERE company_id = p_source_company_id;

  -- Drop affiliations that would duplicate (person_id, target company).
  DELETE FROM public.person_company_affiliations pca
  USING public.person_company_affiliations existing
  WHERE pca.company_id = p_source_company_id
    AND existing.person_id = pca.person_id
    AND existing.company_id = p_target_company_id;

  UPDATE public.person_company_affiliations
  SET company_id = p_target_company_id
  WHERE company_id = p_source_company_id;

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

  DELETE FROM public.companies
  WHERE id = p_source_company_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.admin_merge_companies(uuid, uuid) IS
  'Admin-only: moves credits and affiliations to target company, merges steward rows (owner wins), deletes source company.';

REVOKE ALL ON FUNCTION public.admin_merge_companies(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_merge_companies(uuid, uuid) TO authenticated;
