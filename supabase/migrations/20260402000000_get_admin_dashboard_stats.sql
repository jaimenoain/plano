-- Migration to create get_admin_dashboard_stats RPC

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
  v_activity_trends json;
  v_hot_groups json;
  v_session_reliability json;
  v_trending_films json;
BEGIN
  -- Zone 1: The Pulse
  SELECT COUNT(*) INTO v_total_users FROM profiles;

  SELECT COUNT(*) INTO v_new_users_30d
  FROM profiles
  WHERE created_at > (NOW() - INTERVAL '30 days');

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
  SELECT COUNT(DISTINCT user_id) INTO v_active_users_24h FROM active_24h;

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
  SELECT COUNT(DISTINCT user_id) INTO v_active_users_30d FROM active_30d;

  SELECT COUNT(*) INTO v_total_follows FROM follows;

  IF v_total_users > 0 THEN
    v_network_density := ROUND((v_total_follows::numeric / v_total_users::numeric), 2);
  ELSE
    v_network_density := 0;
  END IF;

  -- Zone 2: Activity Trends (Daily over last 30 days)
  WITH dates AS (
    SELECT generate_series(
      (NOW() - INTERVAL '29 days')::date,
      NOW()::date,
      '1 day'::interval
    )::date AS day
  ),
  daily_logs AS (
    SELECT created_at::date AS day, COUNT(*) AS cnt FROM log
    WHERE created_at > (NOW() - INTERVAL '30 days')
    GROUP BY 1
  ),
  daily_comments AS (
    SELECT day, SUM(cnt) AS cnt FROM (
      SELECT created_at::date AS day, COUNT(*) AS cnt FROM comments WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY 1
      UNION ALL
      SELECT created_at::date AS day, COUNT(*) AS cnt FROM session_comments WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY 1
    ) sub GROUP BY 1
  ),
  daily_likes AS (
    SELECT day, SUM(cnt) AS cnt FROM (
      SELECT created_at::date AS day, COUNT(*) AS cnt FROM likes WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY 1
      UNION ALL
      SELECT created_at::date AS day, COUNT(*) AS cnt FROM session_likes WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY 1
      UNION ALL
      SELECT created_at::date AS day, COUNT(*) AS cnt FROM comment_likes WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY 1
    ) sub GROUP BY 1
  ),
  daily_votes AS (
    SELECT created_at::date AS day, COUNT(*) AS cnt FROM poll_votes
    WHERE created_at > (NOW() - INTERVAL '30 days')
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
    'date', d.day,
    'logs', COALESCE(l.cnt, 0),
    'comments', COALESCE(c.cnt, 0),
    'likes', COALESCE(k.cnt, 0),
    'votes', COALESCE(v.cnt, 0)
  )) INTO v_activity_trends
  FROM dates d
  LEFT JOIN daily_logs l ON d.day = l.day
  LEFT JOIN daily_comments c ON d.day = c.day
  LEFT JOIN daily_likes k ON d.day = k.day
  LEFT JOIN daily_votes v ON d.day = v.day;

  -- Zone 3: Hot Groups Leaderboard
  -- Activity Score: Logs linked to group + Comments linked to group logs + Session comments + Poll votes?
  -- Simplified: Count of logs in group + comments on those logs + session comments in group sessions.
  WITH group_activity AS (
    SELECT
      g.id AS group_id,
      g.name,
      COUNT(DISTINCT gm.user_id) AS member_count,
      COUNT(DISTINCT CASE WHEN gs.session_date > (NOW() - INTERVAL '30 days') THEN gs.id END) AS sessions_30d,
      (
        COALESCE((SELECT COUNT(*) FROM log WHERE group_id = g.id AND created_at > (NOW() - INTERVAL '30 days')), 0) +
        COALESCE((SELECT COUNT(*) FROM comments c JOIN log l ON c.interaction_id = l.id WHERE l.group_id = g.id AND c.created_at > (NOW() - INTERVAL '30 days')), 0) +
        COALESCE((SELECT COUNT(*) FROM session_comments sc JOIN group_sessions s ON sc.session_id = s.id WHERE s.group_id = g.id AND sc.created_at > (NOW() - INTERVAL '30 days')), 0)
      ) AS activity_score
    FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id
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
  -- Planned: status in ('published', 'draft')? No, reliability usually implies commitment. Let's say Published.
  -- Completed: Published AND date < NOW() AND (has linked activity or explicit status).
  -- Simple metric: (Completed Sessions / Total Published Sessions in past)
  -- Or: Planned vs Completed.
  -- Let's define:
  -- Total Planned: All sessions created > 30 days ago? Or sessions in last 30d?
  -- Let's look at all sessions in last 90 days.
  WITH session_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'published') as published_count,
      COUNT(*) FILTER (WHERE status = 'published' AND session_date < NOW() AND (
        EXISTS (SELECT 1 FROM session_comments WHERE session_id = group_sessions.id) OR
        EXISTS (SELECT 1 FROM session_likes WHERE session_id = group_sessions.id) OR
        EXISTS (SELECT 1 FROM log WHERE group_id = group_sessions.group_id AND created_at BETWEEN session_date AND session_date + INTERVAL '2 days') -- Loose correlation
      )) as completed_count
    FROM group_sessions
    WHERE session_date > (NOW() - INTERVAL '90 days')
  )
  SELECT row_to_json(t) INTO v_session_reliability FROM session_stats t;

  -- Zone 4: Trending Films (Last 7 days)
  WITH trending AS (
    SELECT
      l.film_id,
      f.title,
      f.poster_path,
      COUNT(*) as log_count
    FROM log l
    JOIN films f ON l.film_id = f.id
    WHERE l.created_at > (NOW() - INTERVAL '7 days')
    GROUP BY l.film_id, f.title, f.poster_path
    ORDER BY log_count DESC
    LIMIT 5
  )
  SELECT json_agg(row_to_json(t)) INTO v_trending_films FROM trending t;

  RETURN json_build_object(
    'pulse', json_build_object(
      'total_users', v_total_users,
      'new_users_30d', v_new_users_30d,
      'active_users_24h', v_active_users_24h,
      'active_users_30d', v_active_users_30d,
      'network_density', v_network_density
    ),
    'activity_trends', v_activity_trends,
    'group_dynamics', json_build_object(
      'hot_groups', COALESCE(v_hot_groups, '[]'::json),
      'session_reliability', v_session_reliability
    ),
    'content_intelligence', json_build_object(
      'trending_films', COALESCE(v_trending_films, '[]'::json)
    )
  );
END;
$$;
