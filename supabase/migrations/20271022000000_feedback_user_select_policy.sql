-- Allow users to select their own feedback rows so the insert+returning pattern works.
-- Without this, the .select("id").single() after INSERT returns null (RLS blocks the read)
-- and the API incorrectly returns 500 "Insert failed".
CREATE POLICY "Users select own feedback"
  ON public.feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
