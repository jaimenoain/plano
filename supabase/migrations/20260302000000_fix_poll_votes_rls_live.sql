-- Fix poll_votes RLS to allow voting on 'live' polls

-- We allow authenticated users to INSERT votes if the poll is 'open' OR 'live'.
-- Previously, policies might have been restricted to 'open'.
-- Since policies are additive (OR), adding this policy ensures access for 'live' polls.

CREATE POLICY "Users can vote on live polls" ON poll_votes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM polls
    WHERE polls.id = poll_votes.poll_id
    AND polls.status IN ('open', 'live')
  )
);

-- Allow users to delete their own votes on live polls (for "clean slate" logic or changing vote)
CREATE POLICY "Users can delete their own votes on live polls" ON poll_votes
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM polls
    WHERE polls.id = poll_votes.poll_id
    AND polls.status IN ('open', 'live')
  )
);
