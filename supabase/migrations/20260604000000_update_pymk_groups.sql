DROP FUNCTION IF EXISTS get_people_you_may_know(integer);

CREATE OR REPLACE FUNCTION get_people_you_may_know(p_limit integer DEFAULT 3)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  mutual_count bigint,
  is_follows_me boolean,
  group_mutual_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();

  RETURN QUERY
  WITH my_follows AS (
    SELECT following_id FROM follows WHERE follower_id = v_current_user_id
  ),
  candidate_scores AS (
    SELECT
      p.id,
      p.username,
      p.avatar_url,
      EXISTS (
          SELECT 1 FROM follows WHERE follower_id = p.id AND following_id = v_current_user_id
      ) as is_follows_me,
      (
        -- Priority 1: Count of mutuals (How many of my followings follow this person?)
        COALESCE((
          SELECT COUNT(*)
          FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id
          WHERE f1.follower_id = v_current_user_id
          AND f2.following_id = p.id
        ), 0) * 10
      ) +
      (
        -- Priority 2: Does this person follow me?
        CASE WHEN EXISTS (
          SELECT 1 FROM follows WHERE follower_id = p.id AND following_id = v_current_user_id
        ) THEN 5 ELSE 0 END
      ) +
      (
        -- Priority 3: Common groups
        COALESCE((
          SELECT COUNT(*)
          FROM group_members gm1
          JOIN group_members gm2 ON gm1.group_id = gm2.group_id
          WHERE gm1.user_id = v_current_user_id
          AND gm2.user_id = p.id
          AND gm1.status = 'active'
          AND gm2.status = 'active'
        ), 0) * 8
      ) +
      (
        -- Priority 4: Global popularity (scaled down)
        (SELECT COUNT(*) FROM follows WHERE following_id = p.id) * 0.1
      ) as score,
      COALESCE((
          SELECT COUNT(*)
          FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id
          WHERE f1.follower_id = v_current_user_id
          AND f2.following_id = p.id
        ), 0) as mutual_count,
      COALESCE((
          SELECT COUNT(*)
          FROM group_members gm1
          JOIN group_members gm2 ON gm1.group_id = gm2.group_id
          WHERE gm1.user_id = v_current_user_id
          AND gm2.user_id = p.id
          AND gm1.status = 'active'
          AND gm2.status = 'active'
        ), 0) as group_mutual_count
    FROM profiles p
    WHERE p.id != v_current_user_id
    AND NOT EXISTS (
      SELECT 1 FROM my_follows mf WHERE mf.following_id = p.id
    )
  )
  SELECT
    cs.id,
    cs.username,
    cs.avatar_url,
    cs.mutual_count,
    cs.is_follows_me,
    cs.group_mutual_count
  FROM candidate_scores cs
  ORDER BY cs.score DESC
  LIMIT p_limit;
END;
$$;
