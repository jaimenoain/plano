-- Allow users to update their own review images (e.g. for is_generated flag)
CREATE POLICY "Users can update their own review images"
ON public.review_images FOR UPDATE
USING (auth.uid() = user_id);
