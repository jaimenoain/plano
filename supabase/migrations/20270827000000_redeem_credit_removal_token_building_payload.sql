-- Task 6.4 (Roadmap): success payload includes building summary for removal thank-you CTA.
-- After redemption the credit is hidden; anon cannot SELECT building_credits, so the RPC
-- must return building id/name/slug while still SECURITY DEFINER.
-- Apply via Supabase SQL Editor after 20270824000000_redeem_credit_removal_token.sql.

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
  v_building_id uuid;
  v_building_name text;
  v_building_slug text;
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

  SELECT b.id, b.name, b.slug
  INTO v_building_id, v_building_name, v_building_slug
  FROM public.building_credits bc
  JOIN public.buildings b ON b.id = bc.building_id
  WHERE bc.id = v_row.credit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'credit_id', v_row.credit_id,
    'building_id', v_building_id,
    'building_name', v_building_name,
    'building_slug', v_building_slug
  );
END;
$$;

COMMENT ON FUNCTION public.redeem_credit_removal_token(text) IS
  'Redeem one-time credit removal link: hide building_credit, set token used_at; returns building summary for UI CTA. Callable by anon/authenticated.';
