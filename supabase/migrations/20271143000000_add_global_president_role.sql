-- Add global_president role.
-- global_president ≈ global_leaders with additional special features (TBD).
-- Sits at the top of the global hierarchy.

-- ── 1. Extend the role CHECK constraint ───────────────────────────────────────
ALTER TABLE public.ambassador_memberships
  DROP CONSTRAINT IF EXISTS ambassador_memberships_role_check;

ALTER TABLE public.ambassador_memberships
  ADD CONSTRAINT ambassador_memberships_role_check
  CHECK (role IN (
    'president', 'exco', 'ambassador',
    'global_team', 'global_leaders', 'global_president'
  ));

-- ── 2. Recreate is_chapter_leader() ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_chapter_leader(p_chapter_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.ambassador_memberships m
    WHERE m.user_id = (SELECT auth.uid())
      AND m.chapter_id = p_chapter_id
      AND m.role IN ('president', 'exco', 'global_leaders', 'global_team', 'global_president')
      AND m.status = 'active'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_chapter_leader(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chapter_leader(uuid) TO authenticated;

-- ── 3. Recreate is_chapter_president() ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_chapter_president(p_chapter_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.ambassador_memberships m
    WHERE m.user_id = (SELECT auth.uid())
      AND m.chapter_id = p_chapter_id
      AND m.role IN ('president', 'global_leaders', 'global_president')
      AND m.status = 'active'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_chapter_president(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chapter_president(uuid) TO authenticated;

-- ── 4. Recreate get_chapter_team() with updated sort order ───────────────────
CREATE OR REPLACE FUNCTION public.get_chapter_team(p_chapter_id uuid)
RETURNS TABLE (
  user_id             uuid,
  username            text,
  avatar_url          text,
  role                text,
  exco_responsibility text,
  joined_at           timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    am.user_id,
    p.username,
    p.avatar_url,
    am.role,
    am.exco_responsibility,
    am.joined_at
  FROM public.ambassador_memberships am
  JOIN public.profiles p ON p.id = am.user_id
  WHERE am.chapter_id = p_chapter_id
    AND am.status = 'active'
  ORDER BY
    CASE am.role
      WHEN 'global_president' THEN 1
      WHEN 'global_leaders'   THEN 2
      WHEN 'president'        THEN 3
      WHEN 'global_team'      THEN 4
      WHEN 'exco'             THEN 5
      ELSE                         6
    END,
    p.username;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_team(uuid) TO authenticated;
