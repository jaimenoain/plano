DROP POLICY IF EXISTS "Users can update their own follows" ON "public"."follows";

CREATE POLICY "Users can update their own follows" ON "public"."follows"
FOR UPDATE
USING (auth.uid() = follower_id);
