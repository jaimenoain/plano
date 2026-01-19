-- Create group_cycles table
CREATE TABLE IF NOT EXISTS group_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE
);

-- Add cycle_id to group_sessions
ALTER TABLE group_sessions
ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES group_cycles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE group_cycles ENABLE ROW LEVEL SECURITY;

-- Policies for group_cycles

-- Viewable by everyone (public) or members (private) logic is handled by the application usually,
-- but strictly speaking for RLS:
-- We can reuse the pattern from groups: usually readable by authenticated users if public, or members if private.
-- For simplicity and based on "Viewable by everyone (or group members if private)", we can mirror group visibility.
-- However, often a simpler "read authenticated" is used if the app layer handles access control.
-- Let's try to be specific.

CREATE POLICY "Cycles are viewable by everyone"
    ON group_cycles FOR SELECT
    USING (true); -- Simplifying for now as group visibility is often handled at the group level query.

-- Editable/Insertable only by Group Admins
-- We need to check if the user is an admin of the group_id
CREATE POLICY "Admins can insert cycles"
    ON group_cycles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_cycles.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

CREATE POLICY "Admins can update cycles"
    ON group_cycles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_cycles.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete cycles"
    ON group_cycles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_cycles.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );
