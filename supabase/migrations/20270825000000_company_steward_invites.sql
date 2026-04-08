-- Task 4.2 (Roadmap): steward invites + tighter steward removal + redemption RPC.
-- Apply via Supabase SQL Editor. Depends on companies + company_stewards (20270820).

-- ---------------------------------------------------------------------------
-- Invites: opaque token (SHA-256 in DB); rows readable/writable only via service role / RPC
-- ---------------------------------------------------------------------------

CREATE TABLE public.company_steward_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  token_hash bytea NOT NULL,
  invited_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT company_steward_invites_pkey PRIMARY KEY (id),
  CONSTRAINT company_steward_invites_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX company_steward_invites_company_id_idx ON public.company_steward_invites (company_id);

ALTER TABLE public.company_steward_invites ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.company_steward_invites IS
  'Pending company steward invitations; no client policies — Edge Functions use service role.';

-- ---------------------------------------------------------------------------
-- RLS: only owners may remove other stewards; any steward may remove self
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "company_stewards_delete" ON public.company_stewards;

CREATE POLICY "company_stewards_delete" ON public.company_stewards
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_stewards actor
      WHERE actor.company_id = company_stewards.company_id
        AND actor.user_id = (SELECT auth.uid())
        AND actor.role = 'owner'::public.company_steward_role
        AND company_stewards.role = 'steward'::public.company_steward_role
    )
  );

-- ---------------------------------------------------------------------------
-- Redeem invite: logged-in user email must match invite; creates steward row
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

  UPDATE public.company_steward_invites
  SET consumed_at = v_now
  WHERE id = v_row.id;

  SELECT slug INTO v_slug FROM public.companies WHERE id = v_row.company_id;

  RETURN jsonb_build_object('ok', true, 'company_slug', v_slug);
END;
$$;

COMMENT ON FUNCTION public.redeem_company_steward_invite(text) IS
  'Accept steward invite: verify token + email, insert company_stewards (steward), mark invite consumed.';

REVOKE ALL ON FUNCTION public.redeem_company_steward_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_company_steward_invite(text) TO authenticated;
