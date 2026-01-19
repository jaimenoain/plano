-- Create a function to efficiently fetch group summaries for the Groups page
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
) AS $$
DECLARE
  v_group_ids UUID[];
BEGIN
  -- 1. Identify target groups
  IF p_type = 'my' THEN
    SELECT ARRAY_AGG(group_id) INTO v_group_ids
    FROM group_members
    WHERE user_id = p_user_id AND status = 'active';
  ELSIF p_type = 'public' THEN
    SELECT ARRAY_AGG(id) INTO v_group_ids
    FROM (
      SELECT id
      FROM groups
      WHERE is_public = TRUE
      AND id NOT IN (
        SELECT group_id FROM group_members WHERE user_id = p_user_id
      )
      LIMIT p_limit
    ) t;
  END IF;

  -- Handle case where no groups found
  IF v_group_ids IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH group_details AS (
    SELECT g.id, g.slug, g.name, g.description, g.is_public, g.cover_url
    FROM groups g
    WHERE g.id = ANY(v_group_ids)
  ),
  members_agg AS (
    SELECT
      gm.group_id,
      COUNT(gm.user_id) as count,
      ARRAY_AGG(p.avatar_url) FILTER (WHERE p.avatar_url IS NOT NULL) as avatars
    FROM group_members gm
    JOIN profiles p ON gm.user_id = p.id
    WHERE gm.group_id = ANY(v_group_ids)
    GROUP BY gm.group_id
  ),
  sessions_agg AS (
    SELECT
      gs.group_id,
      MIN(gs.session_date) FILTER (WHERE gs.session_date >= NOW()) as next_date,
      MAX(gs.session_date) FILTER (WHERE gs.session_date < NOW()) as last_date
    FROM group_sessions gs
    WHERE gs.group_id = ANY(v_group_ids)
    GROUP BY gs.group_id
  ),
  posters_agg AS (
    SELECT
      gs.group_id,
      ARRAY_AGG(f.poster_path ORDER BY gs.session_date DESC) FILTER (WHERE f.poster_path IS NOT NULL) as posters
    FROM group_sessions gs
    JOIN session_films sf ON gs.id = sf.session_id
    JOIN films f ON sf.film_id = f.id
    WHERE gs.group_id = ANY(v_group_ids)
    GROUP BY gs.group_id
  )
  SELECT
    gd.id,
    gd.slug,
    gd.name,
    gd.description,
    gd.is_public,
    gd.cover_url,
    COALESCE(ma.count, 0),
    COALESCE(ma.avatars[1:3], ARRAY[]::TEXT[]),
    sa.next_date,
    sa.last_date,
    -- Get distinct posters, limit to 4.
    COALESCE(pa.posters[1:4], ARRAY[]::TEXT[])
  FROM group_details gd
  LEFT JOIN members_agg ma ON gd.id = ma.group_id
  LEFT JOIN sessions_agg sa ON gd.id = sa.group_id
  LEFT JOIN posters_agg pa ON gd.id = pa.group_id;
END;
$$ LANGUAGE plpgsql;
