-- Roadmap Phase 8 Task 8.3: entity + credit events in admin_audit_logs; RLS for actor self-insert;
-- RPC hooks for claims and steward flows. Apply via Supabase SQL Editor after prior migrations.

-- ---------------------------------------------------------------------------
-- RLS: authenticated users may append their own credit / steward removal audits
-- (admin_id holds the acting user id for these rows).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "entity_audit_logs_actor_insert" ON public.admin_audit_logs;

CREATE POLICY "entity_audit_logs_actor_insert" ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid())
    AND action_type IN (
      'credit_added',
      'credit_status_changed',
      'steward_removed'
    )
  );

CREATE INDEX IF NOT EXISTS admin_audit_logs_details_building_id_idx
  ON public.admin_audit_logs ((details ->> 'building_id'))
  WHERE (details ->> 'building_id') IS NOT NULL
    AND length(trim(details ->> 'building_id')) > 0;

-- ---------------------------------------------------------------------------
-- claim_person: log person_claimed after successful claim
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_person(p_person_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.people%ROWTYPE;
  v_updated int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.people p
    WHERE p.claimed_by_user_id = v_uid
      AND p.id <> p_person_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed_other');
  END IF;

  SELECT * INTO v_row FROM public.people WHERE id = p_person_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_row.claimed_by_user_id = v_uid AND v_row.claim_status = 'claimed'::public.person_claim_status THEN
    RETURN jsonb_build_object('ok', true, 'person_id', p_person_id);
  END IF;

  IF v_row.claim_status <> 'unclaimed'::public.person_claim_status OR v_row.claimed_by_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  UPDATE public.people
  SET
    claimed_by_user_id = v_uid,
    claim_status = 'claimed'::public.person_claim_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_person_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    INSERT INTO public.admin_audit_logs (admin_id, action_type, target_type, target_id, details)
    VALUES (
      v_uid,
      'person_claimed',
      'person',
      p_person_id::text,
      jsonb_build_object(
        'old_value', to_jsonb(v_row.claim_status::text),
        'new_value', to_jsonb('claimed'::text)
      )
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'person_id', p_person_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_person(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_person(uuid) TO authenticated;

COMMENT ON FUNCTION public.claim_person(uuid) IS
  'Claim an unclaimed person profile: set claimed_by_user_id and claim_status claimed. One person per user. Idempotent if caller already owns this row. Appends person_claimed to admin_audit_logs.';

-- ---------------------------------------------------------------------------
-- redeem_company_claim_token: company_claimed + steward_added (owner)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_company_claim_token(p_token_hex text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trim text := lower(trim(p_token_hex));
  v_secret bytea;
  v_hash bytea;
  v_row public.company_claim_verification_tokens%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_company public.companies%ROWTYPE;
  v_domain text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_trim IS NULL OR length(v_trim) <> 64 OR v_trim !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  v_secret := decode(v_trim, 'hex');
  v_hash := extensions.digest(v_secret, 'sha256');

  SELECT * INTO v_row FROM public.company_claim_verification_tokens WHERE token_hash = v_hash FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_token');
  END IF;

  IF v_row.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  IF v_row.expires_at <= v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_row.requester_user_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_user');
  END IF;

  SELECT * INTO v_company FROM public.companies WHERE id = v_row.company_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF v_company.claim_status IS DISTINCT FROM 'unclaimed'::public.person_claim_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.company_stewards cs WHERE cs.company_id = v_row.company_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;

  v_domain := lower(split_part(v_row.email_normalized, '@', 2));
  IF v_domain IS NULL OR length(trim(v_domain)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimable');
  END IF;
  IF v_domain LIKE 'www.%' THEN
    v_domain := substring(v_domain from 5);
  END IF;

  INSERT INTO public.company_stewards (company_id, user_id, role, invited_by)
  VALUES (
    v_row.company_id,
    v_uid,
    'owner'::public.company_steward_role,
    NULL
  );

  UPDATE public.companies
  SET
    claim_status = 'claimed'::public.person_claim_status,
    verified_domain = v_domain,
    updated_at = v_now
  WHERE id = v_row.company_id;

  UPDATE public.company_claim_verification_tokens
  SET consumed_at = v_now
  WHERE id = v_row.id;

  INSERT INTO public.admin_audit_logs (admin_id, action_type, target_type, target_id, details)
  VALUES (
    v_uid,
    'company_claimed',
    'company',
    v_row.company_id::text,
    jsonb_build_object(
      'old_value', to_jsonb(v_company.claim_status::text),
      'new_value', to_jsonb('claimed'::text),
      'verified_domain', to_jsonb(v_domain)
    )
  );

  INSERT INTO public.admin_audit_logs (admin_id, action_type, target_type, target_id, details)
  VALUES (
    v_uid,
    'steward_added',
    'company',
    v_row.company_id::text,
    jsonb_build_object(
      'steward_user_id', to_jsonb(v_uid::text),
      'role', to_jsonb('owner'::text),
      'via', to_jsonb('company_claim'::text)
    )
  );

  RETURN jsonb_build_object('ok', true, 'company_slug', v_company.slug);
END;
$$;

COMMENT ON FUNCTION public.redeem_company_claim_token(text) IS
  'First company claim: verify email token, insert owner steward, set claimed + verified_domain; audit logs.';

REVOKE ALL ON FUNCTION public.redeem_company_claim_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_company_claim_token(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- approve_company_steward_request: steward_added when a new steward row is created
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_company_steward_request(p_token_hex text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trim text := lower(trim(p_token_hex));
  v_secret bytea;
  v_hash bytea;
  v_tok public.company_steward_request_approval_tokens%ROWTYPE;
  v_req public.company_steward_requests%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_slug text;
  v_is_owner boolean;
  v_inserted boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_trim IS NULL OR length(v_trim) <> 64 OR v_trim !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  v_secret := decode(v_trim, 'hex');
  v_hash := extensions.digest(v_secret, 'sha256');

  SELECT * INTO v_tok
  FROM public.company_steward_request_approval_tokens
  WHERE token_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_token');
  END IF;

  SELECT * INTO v_req
  FROM public.company_steward_requests
  WHERE id = v_tok.request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_token');
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

  IF v_tok.consumed_at IS NOT NULL THEN
    IF v_req.status = 'approved'::public.company_steward_request_status THEN
      SELECT slug INTO v_slug FROM public.companies WHERE id = v_req.company_id;
      RETURN jsonb_build_object(
        'ok', true,
        'company_slug', v_slug,
        'request_id', v_req.id,
        'already_processed', true
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  IF v_tok.expires_at <= v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_req.status = 'rejected'::public.company_steward_request_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  IF v_req.status = 'approved'::public.company_steward_request_status THEN
    UPDATE public.company_steward_request_approval_tokens
    SET consumed_at = v_now
    WHERE id = v_tok.id;

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
        'via', to_jsonb('steward_request'::text)
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

COMMENT ON FUNCTION public.approve_company_steward_request(text) IS
  'Owner approves steward access request via email token; idempotent if already approved. Appends steward_added when a new steward row is created.';

REVOKE ALL ON FUNCTION public.approve_company_steward_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_company_steward_request(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- redeem_company_steward_invite: steward_added
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_company_steward_invite(p_token_hex text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trim text := lower(trim(p_token_hex));
  v_secret bytea;
  v_hash bytea;
  v_row public.company_steward_invites%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_user_email text;
  v_slug text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF v_trim IS NULL OR length(v_trim) <> 64 OR v_trim !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_uid;
  IF v_user_email IS NULL OR length(trim(v_user_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_email');
  END IF;

  v_user_email := lower(trim(v_user_email));

  v_secret := decode(v_trim, 'hex');
  v_hash := extensions.digest(v_secret, 'sha256');

  SELECT * INTO v_row FROM public.company_steward_invites WHERE token_hash = v_hash FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_token');
  END IF;

  IF v_row.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  IF v_row.expires_at <= v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_row.email_normalized <> v_user_email THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.company_stewards cs
    WHERE cs.company_id = v_row.company_id
      AND cs.user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_member');
  END IF;

  INSERT INTO public.company_stewards (company_id, user_id, role, invited_by)
  VALUES (
    v_row.company_id,
    v_uid,
    'steward'::public.company_steward_role,
    v_row.invited_by
  );

  INSERT INTO public.admin_audit_logs (admin_id, action_type, target_type, target_id, details)
  VALUES (
    v_uid,
    'steward_added',
    'company',
    v_row.company_id::text,
    jsonb_build_object(
      'steward_user_id', to_jsonb(v_uid::text),
      'role', to_jsonb('steward'::text),
      'via', to_jsonb('invite'::text)
    )
  );

  UPDATE public.company_steward_invites
  SET consumed_at = v_now
  WHERE id = v_row.id;

  SELECT slug INTO v_slug FROM public.companies WHERE id = v_row.company_id;

  RETURN jsonb_build_object('ok', true, 'company_slug', v_slug);
END;
$$;

COMMENT ON FUNCTION public.redeem_company_steward_invite(text) IS
  'Accept steward invite: verify token + email, insert company_stewards (steward), mark invite consumed; audit log.';

REVOKE ALL ON FUNCTION public.redeem_company_steward_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_company_steward_invite(text) TO authenticated;
