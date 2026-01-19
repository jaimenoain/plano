-- Create group_backlog_items table
CREATE TABLE IF NOT EXISTS group_backlog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Scheduled', 'Archived')) DEFAULT 'Pending',
    admin_note TEXT,
    cycle_id UUID REFERENCES group_cycles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE group_backlog_items ENABLE ROW LEVEL SECURITY;

-- Policies

-- Viewable by group members
CREATE POLICY "Backlog items viewable by group members"
    ON group_backlog_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_backlog_items.group_id
            AND group_members.user_id = auth.uid()
        )
    );

-- Editable/Insertable only by Group Admins
CREATE POLICY "Admins can insert backlog items"
    ON group_backlog_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_backlog_items.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

CREATE POLICY "Admins can update backlog items"
    ON group_backlog_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_backlog_items.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete backlog items"
    ON group_backlog_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = group_backlog_items.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'admin'
        )
    );
