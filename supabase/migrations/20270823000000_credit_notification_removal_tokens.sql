-- Task 1.5 (Roadmap): credit notification log + removal token storage + RPC to mint tokens.
-- Depends on `building_credits` (20270822). Apply via Supabase SQL Editor after Task 1.4.
--
-- Token lifecycle (for operators / edge functions):
-- 1. On notification send: edge function calls `generate_credit_removal_token(credit_id)` (service_role only),
--    inserts into `credit_notification_log` with `recipient_hash` and the same `token_hash` as the new row in
--    `credit_removal_tokens`, and emails a link embedding the raw hex token (never stored in plaintext).
-- 2. On removal: edge function hashes the presented token, looks up `credit_removal_tokens` by `token_hash`,
--    checks `used_at` IS NULL and `expires_at` > now(), applies removal, sets `used_at`.
-- 3. Single-use: `used_at` must be set when consumed; reject if already set.
-- 4. Expiry: default 30 days from issue (`expires_at`); reject if expired.

-- Supabase typically installs pgcrypto in `extensions`; qualify calls below if needed.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- credit_removal_tokens (minted by RPC; validated by edge functions, service role)
-- ---------------------------------------------------------------------------

CREATE TABLE public.credit_removal_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_id uuid NOT NULL,
  token_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,

  CONSTRAINT credit_removal_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT credit_removal_tokens_credit_id_fkey
    FOREIGN KEY (credit_id) REFERENCES public.building_credits (id) ON DELETE CASCADE,
  CONSTRAINT credit_removal_tokens_token_hash_len
    CHECK (octet_length(token_hash) = 32)
);

CREATE INDEX credit_removal_tokens_credit_id_idx ON public.credit_removal_tokens (credit_id);
CREATE UNIQUE INDEX credit_removal_tokens_token_hash_uidx ON public.credit_removal_tokens (token_hash);

COMMENT ON TABLE public.credit_removal_tokens IS
  'SHA-256 hashes of one-time credit removal secrets; rows created by generate_credit_removal_token. No public access — edge functions use service_role.';

-- ---------------------------------------------------------------------------
-- credit_notification_log (append-only audit of sends; no plaintext email)
-- ---------------------------------------------------------------------------

CREATE TABLE public.credit_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_hash bytea NOT NULL,
  token_hash bytea NOT NULL,

  CONSTRAINT credit_notification_log_pkey PRIMARY KEY (id),
  CONSTRAINT credit_notification_log_credit_id_fkey
    FOREIGN KEY (credit_id) REFERENCES public.building_credits (id) ON DELETE CASCADE,
  CONSTRAINT credit_notification_log_recipient_hash_len
    CHECK (octet_length(recipient_hash) = 32),
  CONSTRAINT credit_notification_log_token_hash_len
    CHECK (octet_length(token_hash) = 32)
);

CREATE INDEX credit_notification_log_credit_id_idx ON public.credit_notification_log (credit_id);
CREATE INDEX credit_notification_log_sent_at_idx ON public.credit_notification_log (sent_at DESC);

COMMENT ON TABLE public.credit_notification_log IS
  'Credit notification sends: recipient and token as SHA-256 only (no email plaintext). Edge functions use service_role.';

-- ---------------------------------------------------------------------------
-- RLS: deny anon/authenticated; service_role bypasses RLS for edge functions
-- ---------------------------------------------------------------------------

ALTER TABLE public.credit_removal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notification_log ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies: default deny for roles subject to RLS.

-- ---------------------------------------------------------------------------
-- RPC: mint token (64-char hex), store SHA-256(secret) on row
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_credit_removal_token(credit_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_secret bytea;
  v_token text;
  v_token_hash bytea;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.building_credits bc WHERE bc.id = credit_id) THEN
    RAISE EXCEPTION 'building credit not found: %', credit_id;
  END IF;

  v_secret := extensions.gen_random_bytes(32);
  v_token := encode(v_secret, 'hex');
  v_token_hash := extensions.digest(v_secret, 'sha256');

  INSERT INTO public.credit_removal_tokens (credit_id, token_hash, expires_at)
  VALUES (credit_id, v_token_hash, now() + interval '30 days');

  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION public.generate_credit_removal_token(uuid) IS
  'Service-role only. Inserts credit_removal_tokens row; returns URL-safe hex secret (64 chars). Store only hashes in DB.';

REVOKE ALL ON FUNCTION public.generate_credit_removal_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_credit_removal_token(uuid) TO service_role;
