-- Restrict feedback SELECT so non-admin users only see their own rows.
-- The earlier migration 20271032000000_feedback_workflow.sql added a
-- "Authenticated read all feedback" policy with USING (true), which let any
-- signed-in user read everyone's feedback. Drop it so the remaining policies
-- ("Admins read feedback" + "Users select own feedback") govern access:
--   - admins read everything
--   - users read only rows where user_id = auth.uid()

DROP POLICY IF EXISTS "Authenticated read all feedback" ON public.feedback;
