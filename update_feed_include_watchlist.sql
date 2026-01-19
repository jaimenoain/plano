-- Update get_main_feed to include watchlist items
CREATE OR REPLACE FUNCTION get_main_feed(p_limit int, p_offset int, p_show_group_activity boolean)
RETURNS SETOF log
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
  FROM log
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
    AND status IN ('review', 'watchlist') -- Added 'watchlist'
    AND (visibility = 'public' OR visibility IS NULL) -- Handle visibility safely
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
