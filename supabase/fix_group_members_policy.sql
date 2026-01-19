
-- Fix for Group Members RLS policy (promote to admin/remove member)

-- 1. Enable RLS on group_members (just in case)
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing conflicting policies for UPDATE
-- Note: You might have different names, but these are the standard ones.
DROP POLICY IF EXISTS "Admins can update group members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can update members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can delete group members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can delete members" ON public.group_members;

-- 3. Create a comprehensive UPDATE policy
-- This allows updating a member if:
--   a) The current user is an admin of the group
--   b) OR The current user is the CREATOR of the group (checking the groups table)
CREATE POLICY "Admins can update group members"
ON public.group_members
FOR UPDATE
TO authenticated
USING (
  -- Check if user is an admin member of the group
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
  OR
  -- Check if user is the creator of the group
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.created_by = auth.uid()
  )
);

-- 4. Create a comprehensive DELETE policy (for removing members)
CREATE POLICY "Admins can delete group members"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  -- Check if user is an admin member of the group
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
  OR
  -- Check if user is the creator of the group
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.created_by = auth.uid()
  )
);
