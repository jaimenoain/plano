-- Enable RLS
ALTER TABLE public.session_buildings ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy
-- A user can read a session_buildings row if the linked group_sessions belongs to a groups record where is_public = true,
-- OR if the auth.uid() exists in group_members with an 'active' status for that group.
CREATE POLICY "Users can view session_buildings for public groups or if active member"
ON public.session_buildings
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.group_sessions gs
        JOIN public.groups g ON g.id = gs.group_id
        LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = auth.uid()
        WHERE gs.id = session_buildings.session_id
        AND (
            g.is_public = true
            OR
            (gm.user_id IS NOT NULL AND gm.status = 'active')
        )
    )
);

-- 2. INSERT Policy
-- A user can only insert session_buildings rows if their auth.uid() is an active member (or admin) of the group that owns the session.
CREATE POLICY "Active members can insert session_buildings"
ON public.session_buildings
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.group_sessions gs
        JOIN public.group_members gm ON gm.group_id = gs.group_id
        WHERE gs.id = session_buildings.session_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
);

-- 3. UPDATE Policy
-- A user can only update session_buildings rows if their auth.uid() is an active member (or admin) of the group that owns the session.
CREATE POLICY "Active members can update session_buildings"
ON public.session_buildings
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.group_sessions gs
        JOIN public.group_members gm ON gm.group_id = gs.group_id
        WHERE gs.id = session_buildings.session_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.group_sessions gs
        JOIN public.group_members gm ON gm.group_id = gs.group_id
        WHERE gs.id = session_buildings.session_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
);

-- 4. DELETE Policy
-- A user can only delete session_buildings rows if their auth.uid() is an active member (or admin) of the group that owns the session.
CREATE POLICY "Active members can delete session_buildings"
ON public.session_buildings
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.group_sessions gs
        JOIN public.group_members gm ON gm.group_id = gs.group_id
        WHERE gs.id = session_buildings.session_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
);
