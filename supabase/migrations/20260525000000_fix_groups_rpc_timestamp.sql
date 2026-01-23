CREATE OR REPLACE FUNCTION get_user_groups_summary(
  p_user_id UUID,
  p_type TEXT DEFAULT 'my', -- 'my' or 'public'
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  description TEXT,
  is_public BOOLEAN,
  cover_url TEXT,
  member_count BIGINT,
  member_avatars TEXT[],
  next_session_date TIMESTAMPTZ,
  last_session_date TIMESTAMPTZ,
  recent_posters TEXT[]
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_ids UUID[];
BEGIN
  -- 1. Identify target groups
  IF p_type = 'my' THEN
    SELECT ARRAY_AGG(gm.group_id) INTO v_group_ids
    FROM group_members gm
    WHERE gm.user_id = p_user_id AND gm.status = 'active';
  ELSIF p_type = 'public' THEN
    SELECT ARRAY_AGG(t.id) INTO v_group_ids
    FROM (
      SELECT g.id
      FROM groups g
      WHERE g.is_public = TRUE
      AND g.id NOT IN (
        SELECT gm.group_id FROM group_members gm WHERE gm.user_id = p_user_id
      )
      ORDER BY g.created_at DESC
      LIMIT p_limit
    ) t;
  END IF;

  -- Handle case where no groups found
  IF v_group_ids IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.slug,
    g.name,
    g.description,
    g.is_public,
    g.cover_url,
    (SELECT count(*) FROM group_members gm WHERE gm.group_id = g.id) as member_count,
    COALESCE(
      ARRAY(
        SELECT p.avatar_url
        FROM group_members gm
        JOIN profiles p ON gm.user_id = p.id
        WHERE gm.group_id = g.id AND p.avatar_url IS NOT NULL
        ORDER BY gm.joined_at DESC NULLS LAST
        LIMIT 3
      ),
      ARRAY[]::TEXT[]
    ) as member_avatars,
    (
      SELECT MIN(gs.session_date)
      FROM group_sessions gs
      WHERE gs.group_id = g.id AND gs.session_date >= NOW()
    ) as next_session_date,
    (
      SELECT MAX(gs.session_date)
      FROM group_sessions gs
      WHERE gs.group_id = g.id AND gs.session_date < NOW()
    ) as last_session_date,
    COALESCE(
      ARRAY(
        SELECT f.poster_path
        FROM group_sessions gs
        JOIN session_films sf ON gs.id = sf.session_id
        JOIN films f ON sf.film_id = f.id
        WHERE gs.group_id = g.id AND f.poster_path IS NOT NULL
        ORDER BY gs.session_date DESC
        LIMIT 4
      ),
      ARRAY[]::TEXT[]
    ) as recent_posters
  FROM groups g
  WHERE g.id = ANY(v_group_ids)
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;
