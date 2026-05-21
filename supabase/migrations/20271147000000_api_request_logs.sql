-- api_request_logs: one row per instrumented server-side API call.
-- Captures endpoint, HTTP outcome, LLM model/token usage, and pre-computed cost.
-- RLS: admins read all; authenticated users insert (resource routes act on behalf of user).

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ  NOT NULL    DEFAULT now(),
  endpoint      TEXT         NOT NULL,
  method        TEXT         NOT NULL    DEFAULT 'POST',
  status_code   INT          NOT NULL,
  duration_ms   INT          NOT NULL,
  user_id       UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  model         TEXT,
  input_tokens  INT,
  output_tokens INT,
  cost_usd      NUMERIC(10, 6),
  error_message TEXT,
  metadata      JSONB
);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.api_request_logs FROM anon, authenticated, PUBLIC;

-- Admins can read all logs
CREATE POLICY "Admins can read all api request logs"
  ON public.api_request_logs FOR SELECT
  USING (public.is_admin());

-- Any authenticated user can insert (resource routes acting on behalf of the caller)
CREATE POLICY "Authenticated users can insert api request logs"
  ON public.api_request_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT ON public.api_request_logs TO authenticated;

-- Indexes
CREATE INDEX IF NOT EXISTS api_request_logs_created_at_idx
  ON public.api_request_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS api_request_logs_endpoint_created_idx
  ON public.api_request_logs (endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS api_request_logs_status_code_idx
  ON public.api_request_logs (status_code);
