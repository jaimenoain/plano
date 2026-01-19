CREATE OR REPLACE FUNCTION get_inviter_facepile(inviter_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.avatar_url
  FROM profiles p
  JOIN follows f ON f.following_id = p.id
  WHERE f.follower_id = inviter_id
  ORDER BY
    -- Order 1: Has avatar? Yes first (1), no after (0)
    (CASE WHEN p.avatar_url IS NOT NULL THEN 1 ELSE 0 END) DESC,
    -- Order 2: Number of followers, descending order
    (SELECT COUNT(*) FROM follows f2 WHERE f2.following_id = p.id) DESC,
    -- Order 3: Number of ratings/reviews (log entries), descending order
    (SELECT COUNT(*) FROM log l WHERE l.user_id = p.id) DESC
  LIMIT 4;
END;
$$;
