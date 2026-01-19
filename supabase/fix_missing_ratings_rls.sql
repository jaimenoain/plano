-- Fix for "Missing Ratings" in Group Stats
-- Issue: Users could only see their OWN membership row in 'group_members',
-- causing the application to think they were the only member of the group.
-- This resulted in logs/ratings queries filtering out all other users.

-- 1. Create a helper function to avoid infinite recursion in RLS policies
-- This function gets the list of group IDs the current user belongs to.
-- It runs with SECURITY DEFINER to bypass RLS when fetching the user's own groups.
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid();
$$;

-- 2. Drop existing restrictive SELECT policies on group_members
-- Note: Policy names might vary, so we attempt to drop likely candidates or just create the new one.
-- To be safe and clean, you can inspect existing policies:
-- select * from pg_policies where tablename = 'group_members';

DROP POLICY IF EXISTS "Users can view their own membership" ON public.group_members;
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view other members" ON public.group_members;

-- 3. Create the new permissive SELECT policy
-- This allows a user to view ANY row in group_members IF that row belongs to a group
-- that the user is also a member of.
CREATE POLICY "Group members can view other members"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  group_id IN (SELECT get_my_group_ids())
);
