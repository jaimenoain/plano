-- Roadmap Phase 9 Task 9.2: owners can approve or reject steward access requests from the
-- company dashboard (without using email tokens). Apply via Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- approve_company_steward_request_by_id: same outcome as token-based approve
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_company_steward_request_by_id(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.company_steward_requests%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_slug text;
  v_is_owner boolean;
  v_inserted boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_request_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_req
  FROM public.company_steward_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.company_stewards cs
    WHERE cs.company_id = v_req.company_id
      AND cs.user_id = v_uid
      AND cs.role = 'owner'::public.company_steward_role
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owner');
  END IF;

  IF v_req.status = 'rejected'::public.company_steward_request_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  IF v_req.status = 'approved'::public.company_steward_request_status THEN
    SELECT slug INTO v_slug FROM public.companies WHERE id = v_req.company_id;
    RETURN jsonb_build_object(
      'ok', true,
      'company_slug', v_slug,
      'request_id', v_req.id,
      'already_processed', true
    );
  END IF;

  IF v_req.status IS DISTINCT FROM 'pending'::public.company_steward_request_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.company_stewards cs
    WHERE cs.company_id = v_req.company_id
      AND cs.user_id = v_req.requester_user_id
  ) THEN
    INSERT INTO public.company_stewards (company_id, user_id, role, invited_by)
    VALUES (
      v_req.company_id,
      v_req.requester_user_id,
      'steward'::public.company_steward_role,
      v_uid
    );
    v_inserted := true;
  END IF;

  UPDATE public.company_steward_requests
  SET
    status = 'approved'::public.company_steward_request_status,
    resolved_at = v_now
  WHERE id = v_req.id;

  UPDATE public.company_steward_request_approval_tokens
  SET consumed_at = v_now
  WHERE request_id = v_req.id;

  IF v_inserted THEN
    INSERT INTO public.admin_audit_logs (admin_id, action_type, target_type, target_id, details)
    VALUES (
      v_uid,
      'steward_added',
      'company',
      v_req.company_id::text,
      jsonb_build_object(
        'steward_user_id', to_jsonb(v_req.requester_user_id::text),
        'role', to_jsonb('steward'::text),
        'via', to_jsonb('steward_request_dashboard'::text)
      )
    );
  END IF;

  SELECT slug INTO v_slug FROM public.companies WHERE id = v_req.company_id;

  RETURN jsonb_build_object(
    'ok', true,
    'company_slug', v_slug,
    'request_id', v_req.id,
    'already_processed', false
  );
END;
$$;

COMMENT ON FUNCTION public.approve_company_steward_request_by_id(uuid) IS
  'Owner approves a pending steward access request from the in-app dashboard (no email token).';

REVOKE ALL ON FUNCTION public.approve_company_steward_request_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_company_steward_request_by_id(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- reject_company_steward_request_by_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_company_steward_request_by_id(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.company_steward_requests%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_slug text;
  v_is_owner boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_request_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT * INTO v_req
  FROM public.company_steward_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.company_stewards cs
    WHERE cs.company_id = v_req.company_id
      AND cs.user_id = v_uid
      AND cs.role = 'owner'::public.company_steward_role
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owner');
  END IF;

  IF v_req.status = 'rejected'::public.company_steward_request_status THEN
    SELECT slug INTO v_slug FROM public.companies WHERE id = v_req.company_id;
    RETURN jsonb_build_object(
      'ok', true,
      'company_slug', v_slug,
      'request_id', v_req.id,
      'already_processed', true
    );
  END IF;

  IF v_req.status = 'approved'::public.company_steward_request_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  IF v_req.status IS DISTINCT FROM 'pending'::public.company_steward_request_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  UPDATE public.company_steward_requests
  SET
    status = 'rejected'::public.company_steward_request_status,
    resolved_at = v_now
  WHERE id = v_req.id;

  UPDATE public.company_steward_request_approval_tokens
  SET consumed_at = v_now
  WHERE request_id = v_req.id
    AND consumed_at IS NULL;

  SELECT slug INTO v_slug FROM public.companies WHERE id = v_req.company_id;

  RETURN jsonb_build_object(
    'ok', true,
    'company_slug', v_slug,
    'request_id', v_req.id,
    'already_processed', false
  );
END;
$$;

COMMENT ON FUNCTION public.reject_company_steward_request_by_id(uuid) IS
  'Owner rejects a pending steward access request from the in-app dashboard.';

REVOKE ALL ON FUNCTION public.reject_company_steward_request_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_company_steward_request_by_id(uuid) TO authenticated;
