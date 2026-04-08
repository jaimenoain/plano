-- Roadmap Phase 7 Task 7.3: request steward access on already-claimed companies.
-- Apply via Supabase SQL Editor. Depends on companies, company_stewards, profiles, pgcrypto.

CREATE TYPE public.company_steward_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.company_steward_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT ''::text,
  status public.company_steward_request_status NOT NULL DEFAULT 'pending'::public.company_steward_request_status,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  requester_notified_at timestamptz,

  CONSTRAINT company_steward_requests_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX company_steward_requests_one_pending_per_user_company
  ON public.company_steward_requests (company_id, requester_user_id)
  WHERE status = 'pending'::public.company_steward_request_status;

CREATE INDEX company_steward_requests_company_id_idx
  ON public.company_steward_requests (company_id);

CREATE TABLE public.company_steward_request_approval_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.company_steward_requests (id) ON DELETE CASCADE,
  token_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT company_steward_request_approval_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT company_steward_request_approval_tokens_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX company_steward_request_approval_tokens_request_id_idx
  ON public.company_steward_request_approval_tokens (request_id);

ALTER TABLE public.company_steward_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_steward_request_approval_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.company_steward_requests IS
  'Access requests for claimed companies; approval via owner links + SECURITY DEFINER RPC.';
COMMENT ON TABLE public.company_steward_request_approval_tokens IS
  'Per-owner opaque approval links; Edge Functions + RPC only — no client policies.';

-- SELECT: requester sees own rows; stewards of the company see requests for that company; admin
CREATE POLICY "company_steward_requests_select" ON public.company_steward_requests
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR requester_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = company_steward_requests.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: signed-in non-steward on a claimed company; requester must be self
CREATE POLICY "company_steward_requests_insert" ON public.company_steward_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_steward_requests.company_id
        AND c.claim_status = 'claimed'::public.person_claim_status
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.company_stewards cs
      WHERE cs.company_id = company_steward_requests.company_id
        AND cs.user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Approve: caller must be an owner; idempotent if request already approved
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

  INSERT INTO public.company_stewards (company_id, user_id, role, invited_by)
  SELECT
    v_req.company_id,
    v_req.requester_user_id,
    'steward'::public.company_steward_role,
    v_uid
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.company_stewards cs
    WHERE cs.company_id = v_req.company_id
      AND cs.user_id = v_req.requester_user_id
  );

  UPDATE public.company_steward_requests
  SET
    status = 'approved'::public.company_steward_request_status,
    resolved_at = v_now
  WHERE id = v_req.id;

  UPDATE public.company_steward_request_approval_tokens
  SET consumed_at = v_now
  WHERE request_id = v_req.id;

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
  'Owner approves steward access request via email token; idempotent if already approved.';

REVOKE ALL ON FUNCTION public.approve_company_steward_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_company_steward_request(text) TO authenticated;
