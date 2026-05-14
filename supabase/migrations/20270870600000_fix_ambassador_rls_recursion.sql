-- Fix infinite recursion in ambassador_memberships RLS policy.
-- The recursion happened because the policy called functions that queried the same table,
-- and the policy did not have a strong enough base case to break the recursion.

-- 1. Redefine helpers with clearer SECURITY DEFINER behavior.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'app_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_chapter_leader(p_chapter_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We query the table directly. Since this is SECURITY DEFINER and owned by postgres,
  -- it should bypass RLS, breaking the recursion.
  RETURN EXISTS (
    SELECT 1
    FROM public.ambassador_memberships
    WHERE user_id = auth.uid()
      AND chapter_id = p_chapter_id
      AND role IN ('president', 'exco')
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_chapter_president(p_chapter_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.ambassador_memberships
    WHERE user_id = auth.uid()
      AND chapter_id = p_chapter_id
      AND role = 'president'
      AND status = 'active'
  );
END;
$$;

-- 2. Simplify and fix the policy.
-- We drop the old ones and create a single robust SELECT policy.
DROP POLICY IF EXISTS "Ambassador memberships select" ON public.ambassador_memberships;

CREATE POLICY "Ambassador memberships select"
  ON public.ambassador_memberships
  FOR SELECT
  TO authenticated
  USING (
    -- Base cases (always check these first to break recursion)
    user_id = auth.uid() 
    OR public.is_admin()
    OR (
      -- Use a subquery that targets the chapter leadership
      -- Because is_chapter_leader is SECURITY DEFINER, it bypasses RLS on memberships.
      public.is_chapter_leader(chapter_id)
    )
    OR (
      -- President of national chapter can see members of local sub-chapters
      EXISTS (
        SELECT 1 
        FROM public.ambassador_memberships leader_m
        JOIN public.ambassador_chapters national_c ON national_c.id = leader_m.chapter_id
        JOIN public.ambassador_chapters target_c ON target_c.id = ambassador_memberships.chapter_id
        WHERE leader_m.user_id = auth.uid()
          AND leader_m.role = 'president'
          AND leader_m.status = 'active'
          AND national_c.type = 'national'
          AND (target_c.id = national_c.id OR target_c.parent_chapter_id = national_c.id)
      )
    )
  );

-- Ensure grants are correct
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chapter_leader(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chapter_president(uuid) TO authenticated;
