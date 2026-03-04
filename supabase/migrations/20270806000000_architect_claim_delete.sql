CREATE POLICY "Users can delete their own claims" ON public.architect_claims FOR DELETE TO authenticated USING (user_id = auth.uid());
