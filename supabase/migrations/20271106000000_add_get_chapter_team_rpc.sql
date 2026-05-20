-- RPC: get_chapter_team(p_chapter_id uuid)
-- Returns the public team roster for a chapter (all active members).
-- Accessible to any active ambassador in the chapter — no email exposed.
-- Ordered: president first, then exco, then ambassadors.

CREATE OR REPLACE FUNCTION get_chapter_team(p_chapter_id uuid)
RETURNS TABLE (
  user_id          uuid,
  username         text,
  avatar_url       text,
  role             text,
  exco_responsibility text,
  joined_at        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Any active ambassador (or admin) in the chapter may call this.
  IF NOT _ambassador_can_access_chapter(p_chapter_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    am.user_id,
    p.username,
    p.avatar_url,
    am.role,
    am.exco_responsibility,
    am.onboarded_at AS joined_at
  FROM ambassador_memberships am
  JOIN profiles p ON p.id = am.user_id
  WHERE am.chapter_id = p_chapter_id
    AND am.status = 'active'
  ORDER BY
    CASE am.role
      WHEN 'president'  THEN 1
      WHEN 'exco'       THEN 2
      ELSE                   3
    END,
    p.username;
END;
$$;

GRANT EXECUTE ON FUNCTION get_chapter_team(uuid) TO authenticated;
