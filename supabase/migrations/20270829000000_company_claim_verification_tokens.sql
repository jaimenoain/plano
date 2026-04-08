-- Roadmap Phase 7 Task 7.2: first company claimant via work-email verification link.
-- Apply via Supabase SQL Editor. Depends on companies, company_stewards, profiles, pgcrypto (extensions.digest).

CREATE TABLE public.company_claim_verification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  token_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT company_claim_verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT company_claim_verification_tokens_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX company_claim_verification_tokens_company_id_idx
  ON public.company_claim_verification_tokens (company_id);

ALTER TABLE public.company_claim_verification_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.company_claim_verification_tokens IS
  'Opaque tokens for company first-claim email verification; no client policies — Edge Functions + SECURITY DEFINER RPC.';

-- ---------------------------------------------------------------------------
-- Redeem: same user who requested; company still unclaimed; single owner insert
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

  RETURN jsonb_build_object('ok', true, 'company_slug', v_company.slug);
END;
$$;

COMMENT ON FUNCTION public.redeem_company_claim_token(text) IS
  'First company claim: verify email token, insert owner steward, set claimed + verified_domain.';

REVOKE ALL ON FUNCTION public.redeem_company_claim_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_company_claim_token(text) TO authenticated;
