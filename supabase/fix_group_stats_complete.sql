-- FIX: Group Stats "Missing Ratings" & "Missing Members"
-- ==========================================================
-- This script fixes the Row Level Security (RLS) policies that prevent
-- group members from seeing each other's activity in the Group Sessions view.

-- -----------------------------------------------------------------------------
-- 1. HELPER FUNCTION: get_my_group_ids()
-- -----------------------------------------------------------------------------
-- We need a secure way to get "groups I belong to" without triggering infinite recursion
-- in RLS policies. This function runs as SECURITY DEFINER (admin privileges).

CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 2. TABLE: group_members
-- -----------------------------------------------------------------------------
-- Problem: Users could only see *their own* row in group_members.
-- Result: The app thought the group had only 1 member (the current user).

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Drop potential restrictive policies to ensure a clean slate for this logic
DROP POLICY IF EXISTS "Users can view their own membership" ON public.group_members;
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view other members" ON public.group_members;

-- Allow users to view ALL members of ANY group they belong to
CREATE POLICY "Group members can view other members"
ON public.group_members
FOR SELECT
TO authenticated
USING (
  group_id IN (SELECT get_my_group_ids())
);

-- -----------------------------------------------------------------------------
-- 3. TABLE: log (Ratings/Reviews)
-- -----------------------------------------------------------------------------
-- Problem: Even if we knew who the members were, we couldn't see their logs
-- unless they were 'friends' or the logs were 'public'.
-- Result: "Show Group Stats" would show empty data for non-friend group members.

ALTER TABLE public.log ENABLE ROW LEVEL SECURITY;

-- Drop potential duplicates
DROP POLICY IF EXISTS "Group members can view fellow members' logs" ON public.log;

-- Allow users to view logs of ANYONE who is in a shared group
CREATE POLICY "Group members can view fellow members' logs"
ON public.log
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT user_id FROM group_members
    WHERE group_id IN (SELECT get_my_group_ids())
  )
);

-- -----------------------------------------------------------------------------
-- 4. TABLE: profiles
-- -----------------------------------------------------------------------------
-- Problem: Users might not be able to see names/avatars of non-friend members.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view fellow members' profiles" ON public.profiles;

CREATE POLICY "Group members can view fellow members' profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT user_id FROM group_members
    WHERE group_id IN (SELECT get_my_group_ids())
  )
);
