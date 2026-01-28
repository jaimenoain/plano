-- Fix regression in user_buildings visibility policy
-- Re-adds support for 'contacts' visibility and group privacy
-- This fixes the issue where reviews marked as 'contacts' were hidden from mutual contacts

DROP POLICY IF EXISTS "Users can view user_buildings" ON user_buildings;

CREATE POLICY "Users can view user_buildings" ON user_buildings
    FOR SELECT
    USING (
        -- 1. Author sees everything
        auth.uid() = user_id
        OR
        (
            -- If not private, check other conditions
            visibility IS DISTINCT FROM 'private'
            AND
            (
                -- 2. Public (treat null as public)
                coalesce(visibility, 'public') = 'public'
                OR
                -- 3. Mutual Contacts
                (visibility = 'contacts' AND is_mutual_contact(auth.uid(), user_id))
                OR
                -- 4. Group Members (if part of a group context)
                (
                    group_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM group_members
                        WHERE group_id = user_buildings.group_id
                        AND user_id = auth.uid()
                    )
                )
            )
        )
    );
