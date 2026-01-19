-- 1. Create function to check for mutual follow
CREATE OR REPLACE FUNCTION public.is_mutual_contact(user_id_a uuid, user_id_b uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if A follows B AND B follows A
  RETURN EXISTS (
    SELECT 1
    FROM follows f1
    JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    WHERE f1.follower_id = user_id_a AND f1.following_id = user_id_b
  );
END;
$$;

-- 2. Drop conflicting policies on 'log' table
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.log;
DROP POLICY IF EXISTS "Viewable logs" ON public.log;
DROP POLICY IF EXISTS "Group members can view fellow members' logs" ON public.log;
DROP POLICY IF EXISTS "Logs are viewable by everyone if public, or by owner" ON public.log;

-- 3. Create single consolidated SELECT policy
CREATE POLICY "Strict Visibility Policy" ON public.log
FOR SELECT
USING (
  -- 1. Author sees everything
  auth.uid() = user_id
  OR
  (
    -- Optimization: If private, only author (checked above) should see.
    -- So we only proceed if NOT private.
    visibility IS DISTINCT FROM 'private'
    AND (
      -- 2. Public (or NULL)
      coalesce(visibility, 'public') = 'public'
      OR
      -- 3. Mutual Contacts
      (visibility = 'contacts' AND is_mutual_contact(auth.uid(), user_id))
      OR
      -- 4. Group Members (if linked to group)
      (group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM group_members
          WHERE group_id = log.group_id
          AND user_id = auth.uid()
      ))
    )
  )
);
