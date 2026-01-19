-- Enable RLS on poll_votes if not already enabled
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- 1. Policy for Public/Authenticated users to view votes of visible polls
-- Users can see votes if the poll is LIVE, CLOSED, or PUBLISHED.
-- For OPEN polls, they can only see votes if show_results_before_close is true.
-- "Published" polls effectively have 0 votes (guarded by UI/logic), so exposing them is safe/harmless.
CREATE POLICY "Public viewable poll votes" ON poll_votes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM polls
            WHERE polls.id = poll_votes.poll_id
            AND (
                polls.status IN ('live', 'closed', 'published')
                OR (polls.status = 'open' AND polls.show_results_before_close = true)
            )
        )
    );

-- 2. Policy for Admins to view ALL votes (including drafts and open hidden polls)
CREATE POLICY "Admins can view all votes" ON poll_votes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM polls
            JOIN group_members ON group_members.group_id = polls.group_id
            WHERE polls.id = poll_votes.poll_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('admin', 'moderator')
        )
    );
