CREATE TABLE IF NOT EXISTS public.feedback (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('bug', 'ux_improvement', 'feature_idea', 'other')),
  message         TEXT        NOT NULL CHECK (char_length(message) >= 10),
  page_url        TEXT,
  user_agent      TEXT,
  console_errors  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  screenshot_path TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_user_id_idx    ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback (created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
  ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read feedback"
  ON public.feedback
  FOR SELECT TO authenticated
  USING (public.is_admin());
