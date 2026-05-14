-- Fix infinite recursion in ambassador_memberships RLS policy using a non-RLS view.
-- This is a robust way to bypass RLS inside SECURITY DEFINER functions without triggering recursion.

-- 1. Create a "shadow" view that bypasses RLS (since it will be queried by SECURITY DEFINER functions).
-- We'll put it in a separate schema if possible, but public is fine if we manage permissions.
CREATE OR REPLACE VIEW public._ambassador_memberships_internal AS
  SELECT * FROM public.ambassador_memberships;

-- Only postgres (and thus SECURITY DEFINER functions owned by postgres) should access this view.
REVOKE ALL ON public._ambassador_memberships_internal FROM PUBLIC;
GRANT SELECT ON public._ambassador_memberships_internal TO postgres;

-- 2. Redefine helpers to query the shadow view.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Querying profiles is generally safe as it doesn't recurse back to memberships.
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
  -- Query the INTERNAL view to bypass RLS and break recursion.
  RETURN EXISTS (
    SELECT 1
    FROM public._ambassador_memberships_internal
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
  -- Query the INTERNAL view to bypass RLS and break recursion.
  RETURN EXISTS (
    SELECT 1
    FROM public._ambassador_memberships_internal
    WHERE user_id = auth.uid()
      AND chapter_id = p_chapter_id
      AND role = 'president'
      AND status = 'active'
  );
END;
$$;

-- 3. Simplify and fix the policy.
DROP POLICY IF EXISTS "Ambassador memberships select" ON public.ambassador_memberships;

CREATE POLICY "Ambassador memberships select"
  ON public.ambassador_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin()
    OR public.is_chapter_leader(chapter_id)
    OR (
      -- For the national president case, we also use a safe check.
      -- We can either define another helper or just ensure it's not the primary recursion path.
      -- Let's define a helper for "is_parent_chapter_president" to be safe.
      EXISTS (
        SELECT 1
        FROM public._ambassador_memberships_internal leader_m
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chapter_leader(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chapter_president(uuid) TO authenticated;
