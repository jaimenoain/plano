-- Fix broken functions due to schema changes

-- 1. Drop obsolete search functions referencing 'films' or old log structure
DROP FUNCTION IF EXISTS search_films(text, uuid, uuid, uuid, integer, integer, integer);
DROP FUNCTION IF EXISTS search_films(text, uuid, uuid, uuid, integer, integer, integer, text);
DROP FUNCTION IF EXISTS search_films(text, uuid, uuid, uuid, integer, integer, integer, text, integer);

-- 2. Fix get_main_feed
-- First drop it because the return type signature changes (log -> user_buildings)
-- Although log is renamed to user_buildings, the function signature might still hold the old name or OID reference in a way that makes replacement cleaner.
DROP FUNCTION IF EXISTS get_main_feed(int, int, boolean);

-- Recreate get_main_feed with correct references and enum values
CREATE OR REPLACE FUNCTION get_main_feed(p_limit int, p_offset int, p_show_group_activity boolean)
RETURNS SETOF user_buildings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_following_ids uuid[];
  v_group_ids uuid[];
BEGIN
  -- Get IDs of users the current user follows
  SELECT array_agg(following_id) INTO v_following_ids
  FROM follows
  WHERE follower_id = v_user_id;

  -- Get IDs of groups the user is in if requested
  IF p_show_group_activity THEN
      SELECT array_agg(group_id) INTO v_group_ids
      FROM group_members
      WHERE user_id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT *
  FROM user_buildings
  WHERE
    (
        -- Show my own logs
        user_id = v_user_id
        OR
        -- Show logs from people I follow
        user_id = ANY(v_following_ids)
        OR
        -- Show logs from groups I am in (if enabled)
        (p_show_group_activity AND group_id = ANY(v_group_ids))
    )
    -- Filter by status using the new ENUM values
    -- 'pending' corresponds to 'watchlist'
    -- 'visited' corresponds to 'watched'/'review'
    AND status IN ('pending'::user_building_status, 'visited'::user_building_status)
    AND (visibility = 'public' OR visibility IS NULL)
  ORDER BY COALESCE(edited_at, created_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
