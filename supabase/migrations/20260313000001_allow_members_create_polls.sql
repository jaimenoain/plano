-- Allow members to create and manage their own polls
-- This is necessary for features like "Watchlist Voting Session" where any member can start a poll.

-- 1. Policies for 'polls' table

-- Drop potentially conflicting policies (including from previous drafts)
DROP POLICY IF EXISTS "Members can create polls" ON polls;
DROP POLICY IF EXISTS "Creators can manage their polls" ON polls;
DROP POLICY IF EXISTS "Members can create and manage their polls" ON polls;

-- Allow any group member to insert and manage their own polls.
-- CRITICAL: Must check group membership to prevent unauthorized creation/edits in groups the user is not part of.
CREATE POLICY "Members can create and manage their polls" ON polls
    FOR ALL
    USING (
        created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = polls.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- 2. Policies for 'poll_questions' table

ALTER TABLE poll_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage poll questions" ON poll_questions;
DROP POLICY IF EXISTS "Creators can manage poll questions" ON poll_questions;
DROP POLICY IF EXISTS "Viewable poll questions" ON poll_questions;

-- Admins can do everything
CREATE POLICY "Admins can manage poll questions" ON poll_questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM polls
            JOIN group_members ON group_members.group_id = polls.group_id
            WHERE polls.id = poll_questions.poll_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('admin', 'moderator')
        )
    );

-- Creators can do everything for their polls, IF they are still members
CREATE POLICY "Creators can manage poll questions" ON poll_questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM polls
            JOIN group_members ON group_members.group_id = polls.group_id
            WHERE polls.id = poll_questions.poll_id
            AND polls.created_by = auth.uid()
            AND group_members.user_id = auth.uid()
        )
    );

-- Viewable: Public polls OR Creator (even if kicked out? keeping consistent with manage: enforce membership or just relies on poll status)
-- For viewing, usually we are more lenient. If the poll is 'published', anyone can see it.
-- If it's a draft, only creator.
CREATE POLICY "Viewable poll questions" ON poll_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM polls
            WHERE polls.id = poll_questions.poll_id
            AND (
                -- Poll is public/active
                polls.status IN ('published', 'open', 'closed', 'live')
                OR
                -- User is creator (we allow viewing own drafts)
                polls.created_by = auth.uid()
                OR
                -- User is admin
                EXISTS (
                    SELECT 1 FROM group_members
                    WHERE group_members.group_id = polls.group_id
                    AND group_members.user_id = auth.uid()
                    AND group_members.role IN ('admin', 'moderator')
                )
            )
        )
    );


-- 3. Policies for 'poll_options' table

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage poll options" ON poll_options;
DROP POLICY IF EXISTS "Creators can manage poll options" ON poll_options;
DROP POLICY IF EXISTS "Viewable poll options" ON poll_options;

-- Admins
CREATE POLICY "Admins can manage poll options" ON poll_options
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM poll_questions
            JOIN polls ON polls.id = poll_questions.poll_id
            JOIN group_members ON group_members.group_id = polls.group_id
            WHERE poll_questions.id = poll_options.question_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('admin', 'moderator')
        )
    );

-- Creators (with membership check)
CREATE POLICY "Creators can manage poll options" ON poll_options
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM poll_questions
            JOIN polls ON polls.id = poll_questions.poll_id
            JOIN group_members ON group_members.group_id = polls.group_id
            WHERE poll_questions.id = poll_options.question_id
            AND polls.created_by = auth.uid()
            AND group_members.user_id = auth.uid()
        )
    );

-- Viewers
CREATE POLICY "Viewable poll options" ON poll_options
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM poll_questions
            JOIN polls ON polls.id = poll_questions.poll_id
            WHERE poll_questions.id = poll_options.question_id
            AND (
                polls.status IN ('published', 'open', 'closed', 'live')
                OR
                polls.created_by = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM group_members
                    WHERE group_members.group_id = polls.group_id
                    AND group_members.user_id = auth.uid()
                    AND group_members.role IN ('admin', 'moderator')
                )
            )
        )
    );
