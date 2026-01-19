-- Update Poll Policies and Visibility Logic
-- This migration depends on 'draft' and 'published' already existing in the poll_status enum.

-- Drop existing policies to recreate them clearly to avoid conflicts
-- We attempt to drop standard policy names that might exist
DROP POLICY IF EXISTS "Public polls are viewable by everyone" ON polls;
DROP POLICY IF EXISTS "Polls are viewable by everyone" ON polls;
DROP POLICY IF EXISTS "Polls are viewable by members" ON polls;
DROP POLICY IF EXISTS "Admins can insert polls" ON polls;
DROP POLICY IF EXISTS "Admins can update polls" ON polls;
DROP POLICY IF EXISTS "Admins can delete polls" ON polls;
DROP POLICY IF EXISTS "Admins can manage polls" ON polls;
DROP POLICY IF EXISTS "Public viewable polls" ON polls;

-- Create new policies

-- 1. View policy for non-admins (Members/Public)
-- They can only see non-draft polls
CREATE POLICY "Public viewable polls" ON polls
    FOR SELECT
    USING (
        status IN ('published', 'open', 'closed', 'live')
    );

-- 2. Admin Full Access
-- Admins can view ALL polls (including drafts) and perform all actions
CREATE POLICY "Admins can manage polls" ON polls
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = polls.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('admin', 'moderator')
        )
    );
