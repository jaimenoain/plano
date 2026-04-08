-- Task 2.4 (Roadmap): browser-callable redemption for email removal links.
-- Depends on `credit_removal_tokens` (20270823). Apply via Supabase SQL Editor.
--
-- JWT clients cannot read `credit_removal_tokens` (RLS, no policies). This SECURITY DEFINER
-- RPC hashes the presented 64-char hex secret (same as `generate_credit_removal_token` output),
-- validates expiry and single-use, sets `building_credits.status = hidden`, marks `used_at`.

CREATE OR REPLACE FUNCTION public.redeem_credit_removal_token(p_token_hex text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trim text := lower(trim(p_token_hex));
  v_secret bytea;
  v_hash bytea;
  v_row public.credit_removal_tokens%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_trim IS NULL OR length(v_trim) <> 64 OR v_trim !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  v_secret := decode(v_trim, 'hex');
  v_hash := extensions.digest(v_secret, 'sha256');

  SELECT * INTO v_row FROM public.credit_removal_tokens WHERE token_hash = v_hash FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_token');
  END IF;

  IF v_row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  IF v_row.expires_at <= v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  UPDATE public.building_credits
  SET
    status = 'hidden'::public.credit_status_enum,
    updated_at = v_now
  WHERE id = v_row.credit_id;

  UPDATE public.credit_removal_tokens
  SET used_at = v_now
  WHERE id = v_row.id;

  RETURN jsonb_build_object('ok', true, 'credit_id', v_row.credit_id);
END;
$$;

COMMENT ON FUNCTION public.redeem_credit_removal_token(text) IS
  'Redeem one-time credit removal link: hide building_credit, set token used_at. Callable by anon/authenticated.';

REVOKE ALL ON FUNCTION public.redeem_credit_removal_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_credit_removal_token(text) TO anon, authenticated;
