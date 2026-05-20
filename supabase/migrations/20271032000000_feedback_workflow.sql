-- Feedback workflow: status triage, outcome notes, needs_user_input, team read, reopen RPC.

DO $$ BEGIN
  CREATE TYPE public.feedback_status AS ENUM (
    'open',
    'in_review',
    'testing',
    'resolved',
    'wont_fix',
    'duplicate',
    'backlog'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS status public.feedback_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_notes text,
  ADD COLUMN IF NOT EXISTS needs_user_input boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS feedback_status_idx ON public.feedback (status);

-- Team history page: any authenticated user may read all feedback.
CREATE POLICY "Authenticated read all feedback"
  ON public.feedback
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins update feedback"
  ON public.feedback
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reopen terminal items with a user comment (appends to outcome_notes).
CREATE OR REPLACE FUNCTION public.reopen_feedback(p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.feedback%ROWTYPE;
  v_trimmed text;
  v_block text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_trimmed := trim(p_reason);
  IF char_length(v_trimmed) < 5 THEN
    RAISE EXCEPTION 'Reason must be at least 5 characters';
  END IF;
  IF char_length(v_trimmed) > 2000 THEN
    RAISE EXCEPTION 'Reason must be at most 2000 characters';
  END IF;

  SELECT * INTO v_row FROM public.feedback WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback not found';
  END IF;

  IF v_row.status NOT IN ('resolved', 'wont_fix', 'duplicate') THEN
    RAISE EXCEPTION 'Feedback is already active';
  END IF;

  v_block := '— Reopened by user on ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD') || E':\n' || v_trimmed;

  UPDATE public.feedback
  SET
    status = 'open',
    status_changed_at = now(),
    outcome_notes = CASE
      WHEN outcome_notes IS NOT NULL AND trim(outcome_notes) <> '' THEN trim(outcome_notes) || E'\n\n' || v_block
      ELSE v_block
    END
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_feedback(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_feedback(uuid, text) TO authenticated;

-- Notification types for submitter updates.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'follow',
    'like',
    'comment',
    'recommendation',
    'friend_joined',
    'suggest_follow',
    'visit_request',
    'architect_verification',
    'ambassador_application_received',
    'ambassador_application_approved',
    'ambassador_application_rejected',
    'ambassador_membership_review',
    'award_win',
    'feedback_status_updated',
    'feedback_notes_updated'
  ));
