-- Migration to add user leaderboard to admin dashboard stats
-- Adds a new zone for top users by activity in the last 30 days

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users BIGINT;
  v_new_users_30d BIGINT;
  v_active_users_24h BIGINT;
  v_active_users_30d BIGINT;
  v_total_follows BIGINT;
  v_network_density NUMERIC;
  v_actions json;
  v_logins json;
  v_dau_by_feature json;
  v_hot_groups json;
  v_session_reliability json;
  v_trending_films json;
  v_user_leaderboard json;
BEGIN
  -- Zone 1: The Pulse
  SELECT COUNT(*) INTO v_total_users FROM profiles WHERE role IS DISTINCT FROM 'test_user';

  SELECT COUNT(*) INTO v_new_users_30d
  FROM profiles
  WHERE created_at > (NOW() - INTERVAL '30 days')
  AND role IS DISTINCT FROM 'test_user';

  -- Active Users (Union of user_ids from write actions)
  WITH active_24h AS (
    SELECT user_id FROM log WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION
    SELECT user_id FROM comments WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION
    SELECT user_id FROM session_comments WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION
    SELECT user_id FROM likes WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION
    SELECT user_id FROM session_likes WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION
    SELECT user_id FROM comment_likes WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION
    SELECT user_id FROM poll_votes WHERE created_at > (NOW() - INTERVAL '24 hours')
  )
  SELECT COUNT(DISTINCT a.user_id) INTO v_active_users_24h
  FROM active_24h a
  JOIN profiles p ON a.user_id = p.id
  WHERE p.role IS DISTINCT FROM 'test_user';

  WITH active_30d AS (
    SELECT user_id FROM log WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION
    SELECT user_id FROM comments WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION
    SELECT user_id FROM session_comments WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION
    SELECT user_id FROM likes WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION
    SELECT user_id FROM session_likes WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION
    SELECT user_id FROM comment_likes WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION
    SELECT user_id FROM poll_votes WHERE created_at > (NOW() - INTERVAL '30 days')
  )
  SELECT COUNT(DISTINCT a.user_id) INTO v_active_users_30d
  FROM active_30d a
  JOIN profiles p ON a.user_id = p.id
  WHERE p.role IS DISTINCT FROM 'test_user';

  -- Total follows (exclude test users from count)
  SELECT COUNT(*) INTO v_total_follows
  FROM follows f
  JOIN profiles p1 ON f.follower_id = p1.id
  JOIN profiles p2 ON f.following_id = p2.id
  WHERE p1.role IS DISTINCT FROM 'test_user'
  AND p2.role IS DISTINCT FROM 'test_user';

  IF v_total_users > 0 THEN
    v_network_density := ROUND((v_total_follows::numeric / v_total_users::numeric), 2);
  ELSE
    v_network_density := 0;
  END IF;

  -- Zone 2: Activity Trends (Daily over last 30 days)

  -- ACTIONS (Volume)
  WITH dates AS (
    SELECT generate_series(
      (NOW() - INTERVAL '29 days')::date,
      NOW()::date,
      '1 day'::interval
    )::date AS day
  ),
  daily_logs AS (
    SELECT l.created_at::date AS day, COUNT(*) AS cnt
    FROM log l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND p.role IS DISTINCT FROM 'test_user'
    GROUP BY 1
  ),
  daily_comments AS (
    SELECT day, SUM(cnt) AS cnt FROM (
      SELECT c.created_at::date AS day, COUNT(*) AS cnt
      FROM comments c
      JOIN profiles p ON c.user_id = p.id
      WHERE c.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      GROUP BY 1
      UNION ALL
      SELECT sc.created_at::date AS day, COUNT(*) AS cnt
      FROM session_comments sc
      JOIN profiles p ON sc.user_id = p.id
      WHERE sc.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      GROUP BY 1
    ) sub GROUP BY 1
  ),
  daily_likes AS (
    SELECT day, SUM(cnt) AS cnt FROM (
      SELECT k.created_at::date AS day, COUNT(*) AS cnt
      FROM likes k
      JOIN profiles p ON k.user_id = p.id
      WHERE k.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      GROUP BY 1
      UNION ALL
      SELECT sk.created_at::date AS day, COUNT(*) AS cnt
      FROM session_likes sk
      JOIN profiles p ON sk.user_id = p.id
      WHERE sk.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      GROUP BY 1
      UNION ALL
      SELECT ck.created_at::date AS day, COUNT(*) AS cnt
      FROM comment_likes ck
      JOIN profiles p ON ck.user_id = p.id
      WHERE ck.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      GROUP BY 1
    ) sub GROUP BY 1
  ),
  daily_votes AS (
    SELECT v.created_at::date AS day, COUNT(*) AS cnt
    FROM poll_votes v
    JOIN profiles p ON v.user_id = p.id
    WHERE v.created_at > (NOW() - INTERVAL '30 days')
    AND p.role IS DISTINCT FROM 'test_user'
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
    'date', d.day,
    'logs', COALESCE(l.cnt, 0),
    'comments', COALESCE(c.cnt, 0),
    'likes', COALESCE(k.cnt, 0),
    'votes', COALESCE(v.cnt, 0)
  )) INTO v_actions
  FROM dates d
  LEFT JOIN daily_logs l ON d.day = l.day
  LEFT JOIN daily_comments c ON d.day = c.day
  LEFT JOIN daily_likes k ON d.day = k.day
  LEFT JOIN daily_votes v ON d.day = v.day;

  -- LOGINS
  WITH dates AS (
    SELECT generate_series(
      (NOW() - INTERVAL '29 days')::date,
      NOW()::date,
      '1 day'::interval
    )::date AS day
  ),
  daily_logins AS (
    SELECT l.created_at::date AS day, COUNT(*) AS cnt
    FROM login_logs l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND p.role IS DISTINCT FROM 'test_user'
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
    'date', d.day,
    'count', COALESCE(l.cnt, 0)
  )) INTO v_logins
  FROM dates d
  LEFT JOIN daily_logins l ON d.day = l.day;

  -- DAU BY FEATURE (Unique Users)
  WITH dates AS (
    SELECT generate_series(
      (NOW() - INTERVAL '29 days')::date,
      NOW()::date,
      '1 day'::interval
    )::date AS day
  ),
  daily_logs_users AS (
    SELECT l.created_at::date AS day, COUNT(DISTINCT l.user_id) AS cnt
    FROM log l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND p.role IS DISTINCT FROM 'test_user'
    GROUP BY 1
  ),
  daily_comments_users AS (
    SELECT day, COUNT(DISTINCT user_id) AS cnt FROM (
      SELECT c.created_at::date AS day, c.user_id
      FROM comments c
      JOIN profiles p ON c.user_id = p.id
      WHERE c.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      UNION ALL
      SELECT sc.created_at::date AS day, sc.user_id
      FROM session_comments sc
      JOIN profiles p ON sc.user_id = p.id
      WHERE sc.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
    ) sub GROUP BY 1
  ),
  daily_likes_users AS (
    SELECT day, COUNT(DISTINCT user_id) AS cnt FROM (
      SELECT k.created_at::date AS day, k.user_id
      FROM likes k
      JOIN profiles p ON k.user_id = p.id
      WHERE k.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      UNION ALL
      SELECT sk.created_at::date AS day, sk.user_id
      FROM session_likes sk
      JOIN profiles p ON sk.user_id = p.id
      WHERE sk.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      UNION ALL
      SELECT ck.created_at::date AS day, ck.user_id
      FROM comment_likes ck
      JOIN profiles p ON ck.user_id = p.id
      WHERE ck.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
    ) sub GROUP BY 1
  ),
  daily_votes_users AS (
    SELECT v.created_at::date AS day, COUNT(DISTINCT v.user_id) AS cnt
    FROM poll_votes v
    JOIN profiles p ON v.user_id = p.id
    WHERE v.created_at > (NOW() - INTERVAL '30 days')
    AND p.role IS DISTINCT FROM 'test_user'
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
    'date', d.day,
    'logs_users', COALESCE(l.cnt, 0),
    'comments_users', COALESCE(c.cnt, 0),
    'likes_users', COALESCE(k.cnt, 0),
    'votes_users', COALESCE(v.cnt, 0)
  )) INTO v_dau_by_feature
  FROM dates d
  LEFT JOIN daily_logs_users l ON d.day = l.day
  LEFT JOIN daily_comments_users c ON d.day = c.day
  LEFT JOIN daily_likes_users k ON d.day = k.day
  LEFT JOIN daily_votes_users v ON d.day = v.day;

  -- Zone 3: Hot Groups Leaderboard
  WITH group_activity AS (
    SELECT
      g.id AS group_id,
      g.name,
      COUNT(DISTINCT CASE WHEN p_member.role IS DISTINCT FROM 'test_user' THEN gm.user_id END) AS member_count,
      COUNT(DISTINCT CASE WHEN gs.session_date > (NOW() - INTERVAL '30 days') THEN gs.id END) AS sessions_30d,
      (
        COALESCE((SELECT COUNT(*) FROM log l JOIN profiles p ON l.user_id = p.id WHERE l.group_id = g.id AND l.created_at > (NOW() - INTERVAL '30 days') AND p.role IS DISTINCT FROM 'test_user'), 0) +
        COALESCE((SELECT COUNT(*) FROM comments c JOIN log l ON c.interaction_id = l.id JOIN profiles p ON c.user_id = p.id WHERE l.group_id = g.id AND c.created_at > (NOW() - INTERVAL '30 days') AND p.role IS DISTINCT FROM 'test_user'), 0) +
        COALESCE((SELECT COUNT(*) FROM session_comments sc JOIN group_sessions s ON sc.session_id = s.id JOIN profiles p ON sc.user_id = p.id WHERE s.group_id = g.id AND sc.created_at > (NOW() - INTERVAL '30 days') AND p.role IS DISTINCT FROM 'test_user'), 0)
      ) AS activity_score
    FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id
    LEFT JOIN profiles p_member ON gm.user_id = p_member.id
    LEFT JOIN group_sessions gs ON g.id = gs.group_id
    GROUP BY g.id, g.name
  )
  SELECT json_agg(row_to_json(t)) INTO v_hot_groups
  FROM (
    SELECT * FROM group_activity
    ORDER BY activity_score DESC
    LIMIT 10
  ) t;

  -- Session Reliability
  WITH session_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'published') as published_count,
      COUNT(*) FILTER (WHERE status = 'published' AND session_date < NOW() AND (
        EXISTS (SELECT 1 FROM session_comments sc JOIN profiles p ON sc.user_id = p.id WHERE sc.session_id = group_sessions.id AND p.role IS DISTINCT FROM 'test_user') OR
        EXISTS (SELECT 1 FROM session_likes sk JOIN profiles p ON sk.user_id = p.id WHERE sk.session_id = group_sessions.id AND p.role IS DISTINCT FROM 'test_user') OR
        EXISTS (SELECT 1 FROM log l JOIN profiles p ON l.user_id = p.id WHERE l.group_id = group_sessions.group_id AND l.created_at BETWEEN session_date AND session_date + INTERVAL '2 days' AND p.role IS DISTINCT FROM 'test_user')
      )) as completed_count
    FROM group_sessions
    WHERE session_date > (NOW() - INTERVAL '90 days')
  )
  SELECT row_to_json(t) INTO v_session_reliability FROM session_stats t;

  -- Zone 4: Content Intelligence
  WITH trending AS (
    SELECT
      l.film_id,
      f.title,
      f.poster_path,
      COUNT(*) as log_count
    FROM log l
    JOIN films f ON l.film_id = f.id
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '7 days')
    AND p.role IS DISTINCT FROM 'test_user'
    GROUP BY l.film_id, f.title, f.poster_path
    ORDER BY log_count DESC
    LIMIT 5
  )
  SELECT json_agg(row_to_json(t)) INTO v_trending_films FROM trending t;

  -- Zone 5: User Leaderboard (Last 30 days)

  -- Most Reviews (Logs with text)
  WITH top_reviews AS (
    SELECT l.user_id, p.username, p.avatar_url, COUNT(*) as count
    FROM log l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND l.review IS NOT NULL AND length(l.review) > 0
    AND p.role IS DISTINCT FROM 'test_user'
    GROUP BY l.user_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  ),
  -- Most Ratings (Logs with rating)
  top_ratings AS (
    SELECT l.user_id, p.username, p.avatar_url, COUNT(*) as count
    FROM log l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND l.rating IS NOT NULL
    AND p.role IS DISTINCT FROM 'test_user'
    GROUP BY l.user_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  ),
  -- Most Likes
  top_likes_agg AS (
     SELECT user_id, SUM(cnt) as total_count FROM (
        SELECT user_id, COUNT(*) as cnt FROM likes WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY user_id
        UNION ALL
        SELECT user_id, COUNT(*) as cnt FROM session_likes WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY user_id
        UNION ALL
        SELECT user_id, COUNT(*) as cnt FROM comment_likes WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY user_id
     ) sub
     GROUP BY user_id
  ),
  top_likes AS (
    SELECT t.user_id, p.username, p.avatar_url, t.total_count as count
    FROM top_likes_agg t
    JOIN profiles p ON t.user_id = p.id
    WHERE p.role IS DISTINCT FROM 'test_user'
    ORDER BY t.total_count DESC
    LIMIT 5
  ),
  -- Most Comments
  top_comments_agg AS (
      SELECT user_id, SUM(cnt) as total_count FROM (
          SELECT user_id, COUNT(*) as cnt FROM comments WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY user_id
          UNION ALL
          SELECT user_id, COUNT(*) as cnt FROM session_comments WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY user_id
      ) sub
      GROUP BY user_id
  ),
  top_comments AS (
      SELECT t.user_id, p.username, p.avatar_url, t.total_count as count
      FROM top_comments_agg t
      JOIN profiles p ON t.user_id = p.id
      WHERE p.role IS DISTINCT FROM 'test_user'
      ORDER BY t.total_count DESC
      LIMIT 5
  ),
  -- Most Votes
  top_votes AS (
      SELECT v.user_id, p.username, p.avatar_url, COUNT(*) as count
      FROM poll_votes v
      JOIN profiles p ON v.user_id = p.id
      WHERE v.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      GROUP BY v.user_id, p.username, p.avatar_url
      ORDER BY count DESC
      LIMIT 5
  ),
  -- Most Groups Joined
  top_groups AS (
      SELECT gm.user_id, p.username, p.avatar_url, COUNT(*) as count
      FROM group_members gm
      JOIN profiles p ON gm.user_id = p.id
      WHERE gm.created_at > (NOW() - INTERVAL '30 days')
      AND p.role IS DISTINCT FROM 'test_user'
      GROUP BY gm.user_id, p.username, p.avatar_url
      ORDER BY count DESC
      LIMIT 5
  ),
  -- Most Recently Online
  top_online AS (
      SELECT p.id as user_id, p.username, p.avatar_url, p.last_online
      FROM profiles p
      WHERE p.last_online IS NOT NULL
      AND p.role IS DISTINCT FROM 'test_user'
      ORDER BY p.last_online DESC
      LIMIT 5
  )
  SELECT json_build_object(
      'most_reviews', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_reviews t), '[]'::json),
      'most_ratings', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_ratings t), '[]'::json),
      'most_likes', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_likes t), '[]'::json),
      'most_comments', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_comments t), '[]'::json),
      'most_votes', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_votes t), '[]'::json),
      'most_groups_joined', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_groups t), '[]'::json),
      'most_recently_online', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_online t), '[]'::json)
  ) INTO v_user_leaderboard;

  RETURN json_build_object(
    'pulse', json_build_object(
      'total_users', v_total_users,
      'new_users_30d', v_new_users_30d,
      'active_users_24h', v_active_users_24h,
      'active_users_30d', v_active_users_30d,
      'network_density', v_network_density
    ),
    'activity_trends', json_build_object(
      'actions', COALESCE(v_actions, '[]'::json),
      'logins', COALESCE(v_logins, '[]'::json),
      'dau_by_feature', COALESCE(v_dau_by_feature, '[]'::json)
    ),
    'group_dynamics', json_build_object(
      'hot_groups', COALESCE(v_hot_groups, '[]'::json),
      'session_reliability', v_session_reliability
    ),
    'content_intelligence', json_build_object(
      'trending_films', COALESCE(v_trending_films, '[]'::json)
    ),
    'user_leaderboard', v_user_leaderboard
  );
END;
$$;
