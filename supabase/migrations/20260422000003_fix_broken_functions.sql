-- Migration: Fix RPCs for Phase 2 Schema (User Buildings & Enums)

-- 1. Ensure Dependencies Exists
CREATE TABLE IF NOT EXISTS session_buildings (
    session_id UUID REFERENCES group_sessions(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (session_id, building_id)
);

-- 2. get_inviter_facepile
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
    (SELECT COUNT(*) FROM user_buildings l WHERE l.user_id = p.id) DESC
  LIMIT 4;
END;
$$;

-- 3. get_admin_dashboard_stats
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
  v_trending_buildings json;
  v_user_leaderboard json;
  v_retention_analysis json;
  v_notification_intelligence json;
  v_active_users_ids UUID[];
BEGIN
  -- Zone 1: The Pulse
  SELECT COUNT(*) INTO v_total_users FROM profiles WHERE (role IS DISTINCT FROM 'test_user' AND role IS DISTINCT FROM 'admin');

  SELECT COUNT(*) INTO v_new_users_30d
  FROM profiles
  WHERE created_at > (NOW() - INTERVAL '30 days')
  AND (role IS DISTINCT FROM 'test_user' AND role IS DISTINCT FROM 'admin');

  -- Active Users (Union of user_ids from write actions)
  WITH active_24h AS (
    SELECT user_id FROM user_buildings WHERE created_at > (NOW() - INTERVAL '24 hours')
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
  WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin');

  WITH active_30d AS (
    SELECT user_id FROM user_buildings WHERE created_at > (NOW() - INTERVAL '30 days')
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
  ),
  active_users_filtered AS (
     SELECT DISTINCT a.user_id
     FROM active_30d a
     JOIN profiles p ON a.user_id = p.id
     WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
  )
  SELECT COUNT(*) INTO v_active_users_30d FROM active_users_filtered;

  -- Store active user IDs for later use in Notification Intelligence
  WITH active_30d_ids AS (
    SELECT user_id FROM user_buildings WHERE created_at > (NOW() - INTERVAL '30 days')
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
  SELECT array_agg(DISTINCT a.user_id) INTO v_active_users_ids
  FROM active_30d_ids a
  JOIN profiles p ON a.user_id = p.id
  WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin');


  -- Total follows (exclude test users from count)
  SELECT COUNT(*) INTO v_total_follows
  FROM follows f
  JOIN profiles p1 ON f.follower_id = p1.id
  JOIN profiles p2 ON f.following_id = p2.id
  WHERE (p1.role IS DISTINCT FROM 'test_user' AND p1.role IS DISTINCT FROM 'admin')
  AND (p2.role IS DISTINCT FROM 'test_user' AND p2.role IS DISTINCT FROM 'admin');

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
    SELECT l.created_at::date AS day, COUNT(*) AS cnt
    FROM user_buildings l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  ),
  daily_comments AS (
    SELECT day, SUM(cnt) AS cnt FROM (
      SELECT c.created_at::date AS day, COUNT(*) AS cnt
      FROM comments c
      JOIN profiles p ON c.user_id = p.id
      WHERE c.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      GROUP BY 1
      UNION ALL
      SELECT sc.created_at::date AS day, COUNT(*) AS cnt
      FROM session_comments sc
      JOIN profiles p ON sc.user_id = p.id
      WHERE sc.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      GROUP BY 1
    ) sub GROUP BY 1
  ),
  daily_likes AS (
    SELECT day, SUM(cnt) AS cnt FROM (
      SELECT k.created_at::date AS day, COUNT(*) AS cnt
      FROM likes k
      JOIN profiles p ON k.user_id = p.id
      WHERE k.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      GROUP BY 1
      UNION ALL
      SELECT sk.created_at::date AS day, COUNT(*) AS cnt
      FROM session_likes sk
      JOIN profiles p ON sk.user_id = p.id
      WHERE sk.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      GROUP BY 1
      UNION ALL
      SELECT ck.created_at::date AS day, COUNT(*) AS cnt
      FROM comment_likes ck
      JOIN profiles p ON ck.user_id = p.id
      WHERE ck.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      GROUP BY 1
    ) sub GROUP BY 1
  ),
  daily_votes AS (
    SELECT v.created_at::date AS day, COUNT(*) AS cnt
    FROM poll_votes v
    JOIN profiles p ON v.user_id = p.id
    WHERE v.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  ),
  daily_follows AS (
    SELECT f.created_at::date AS day, COUNT(*) AS cnt
    FROM follows f
    JOIN profiles p ON f.follower_id = p.id
    WHERE f.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
    'date', d.day,
    'logs', COALESCE(l.cnt, 0),
    'comments', COALESCE(c.cnt, 0),
    'likes', COALESCE(k.cnt, 0),
    'votes', COALESCE(v.cnt, 0),
    'follows', COALESCE(f.cnt, 0)
  )) INTO v_actions
  FROM dates d
  LEFT JOIN daily_logs l ON d.day = l.day
  LEFT JOIN daily_comments c ON d.day = c.day
  LEFT JOIN daily_likes k ON d.day = k.day
  LEFT JOIN daily_votes v ON d.day = v.day
  LEFT JOIN daily_follows f ON d.day = f.day;

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
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
    'date', d.day,
    'count', COALESCE(l.cnt, 0)
  )) INTO v_logins
  FROM dates d
  LEFT JOIN daily_logins l ON d.day = l.day;

  -- DAU BY FEATURE
  WITH dates AS (
    SELECT generate_series(
      (NOW() - INTERVAL '29 days')::date,
      NOW()::date,
      '1 day'::interval
    )::date AS day
  ),
  daily_logs_users AS (
    SELECT l.created_at::date AS day, COUNT(DISTINCT l.user_id) AS cnt
    FROM user_buildings l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  ),
  daily_comments_users AS (
    SELECT day, COUNT(DISTINCT user_id) AS cnt FROM (
      SELECT c.created_at::date AS day, c.user_id
      FROM comments c
      JOIN profiles p ON c.user_id = p.id
      WHERE c.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      UNION ALL
      SELECT sc.created_at::date AS day, sc.user_id
      FROM session_comments sc
      JOIN profiles p ON sc.user_id = p.id
      WHERE sc.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    ) sub GROUP BY 1
  ),
  daily_likes_users AS (
    SELECT day, COUNT(DISTINCT user_id) AS cnt FROM (
      SELECT k.created_at::date AS day, k.user_id
      FROM likes k
      JOIN profiles p ON k.user_id = p.id
      WHERE k.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      UNION ALL
      SELECT sk.created_at::date AS day, sk.user_id
      FROM session_likes sk
      JOIN profiles p ON sk.user_id = p.id
      WHERE sk.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      UNION ALL
      SELECT ck.created_at::date AS day, ck.user_id
      FROM comment_likes ck
      JOIN profiles p ON ck.user_id = p.id
      WHERE ck.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    ) sub GROUP BY 1
  ),
  daily_votes_users AS (
    SELECT v.created_at::date AS day, COUNT(DISTINCT v.user_id) AS cnt
    FROM poll_votes v
    JOIN profiles p ON v.user_id = p.id
    WHERE v.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  ),
  daily_visitors AS (
    SELECT l.created_at::date AS day, COUNT(DISTINCT l.user_id) AS cnt
    FROM login_logs l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
    'date', d.day,
    'logs_users', COALESCE(l.cnt, 0),
    'comments_users', COALESCE(c.cnt, 0),
    'likes_users', COALESCE(k.cnt, 0),
    'votes_users', COALESCE(v.cnt, 0),
    'visited_users', COALESCE(vis.cnt, 0)
  )) INTO v_dau_by_feature
  FROM dates d
  LEFT JOIN daily_logs_users l ON d.day = l.day
  LEFT JOIN daily_comments_users c ON d.day = c.day
  LEFT JOIN daily_likes_users k ON d.day = k.day
  LEFT JOIN daily_votes_users v ON d.day = v.day
  LEFT JOIN daily_visitors vis ON d.day = vis.day;

  -- Zone 3: Hot Groups Leaderboard
  WITH group_activity AS (
    SELECT
      g.id AS group_id,
      g.name,
      COUNT(DISTINCT CASE WHEN (p_member.role IS DISTINCT FROM 'test_user' AND p_member.role IS DISTINCT FROM 'admin') THEN gm.user_id END) AS member_count,
      COUNT(DISTINCT CASE WHEN gs.session_date > (NOW() - INTERVAL '30 days') THEN gs.id END) AS sessions_30d,
      (
        COALESCE((SELECT COUNT(*) FROM user_buildings l JOIN profiles p ON l.user_id = p.id WHERE l.group_id = g.id AND l.created_at > (NOW() - INTERVAL '30 days') AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')), 0) +
        COALESCE((SELECT COUNT(*) FROM comments c JOIN user_buildings l ON c.interaction_id = l.id JOIN profiles p ON c.user_id = p.id WHERE l.group_id = g.id AND c.created_at > (NOW() - INTERVAL '30 days') AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')), 0) +
        COALESCE((SELECT COUNT(*) FROM session_comments sc JOIN group_sessions s ON sc.session_id = s.id JOIN profiles p ON sc.user_id = p.id WHERE s.group_id = g.id AND sc.created_at > (NOW() - INTERVAL '30 days') AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')), 0)
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
        EXISTS (SELECT 1 FROM session_comments sc JOIN profiles p ON sc.user_id = p.id WHERE sc.session_id = group_sessions.id AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')) OR
        EXISTS (SELECT 1 FROM session_likes sk JOIN profiles p ON sk.user_id = p.id WHERE sk.session_id = group_sessions.id AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')) OR
        EXISTS (SELECT 1 FROM user_buildings l JOIN profiles p ON l.user_id = p.id WHERE l.group_id = group_sessions.group_id AND l.created_at BETWEEN session_date AND session_date + INTERVAL '2 days' AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin'))
      )) as completed_count
    FROM group_sessions
    WHERE session_date > (NOW() - INTERVAL '90 days')
  )
  SELECT row_to_json(t) INTO v_session_reliability FROM session_stats t;

  -- Zone 4: Content Intelligence (TRENDING BUILDINGS)
  WITH trending AS (
    SELECT
      l.building_id,
      b.name,
      b.main_image_url,
      COUNT(*) as log_count
    FROM user_buildings l
    JOIN buildings b ON l.building_id = b.id
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '7 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY l.building_id, b.name, b.main_image_url
    ORDER BY log_count DESC
    LIMIT 5
  )
  SELECT json_agg(row_to_json(t)) INTO v_trending_buildings FROM trending t;

  -- Zone 4.5: Notification Intelligence
  DECLARE
    v_notif_total_notifications BIGINT;
    v_notif_read_notifications BIGINT;
    v_notif_read_rate NUMERIC;
    v_notif_active_users_never_read_percent NUMERIC;
    v_notif_active_ignoring_percent NUMERIC;
    v_notif_unread_distribution json;
  BEGIN
    -- Engagement (Last 30 days)
    SELECT COUNT(*) INTO v_notif_total_notifications
    FROM notifications n
    JOIN profiles p ON n.user_id = p.id
    WHERE n.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin');

    SELECT COUNT(*) INTO v_notif_read_notifications
    FROM notifications n
    JOIN profiles p ON n.user_id = p.id
    WHERE n.created_at > (NOW() - INTERVAL '30 days')
    AND n.is_read = true
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin');

    IF v_notif_total_notifications > 0 THEN
      v_notif_read_rate := ROUND((v_notif_read_notifications::numeric / v_notif_total_notifications::numeric) * 100, 1);
    ELSE
      v_notif_read_rate := 0;
    END IF;

    -- Active Users Never Read / Ignoring (Based on Active Users IDs)
    WITH user_notifs_30d AS (
      SELECT
        n.user_id,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE n.is_read = false) as unread,
        MIN(n.created_at) FILTER (WHERE n.is_read = false) as earliest_unread
      FROM notifications n
      WHERE n.created_at > (NOW() - INTERVAL '30 days')
      AND n.user_id = ANY(v_active_users_ids)
      GROUP BY n.user_id
    ),
    active_with_notifs AS (
       SELECT * FROM user_notifs_30d
    ),
    never_read_counts AS (
       SELECT COUNT(*) as cnt FROM active_with_notifs WHERE unread = total
    ),
    active_ignoring_counts AS (
       SELECT COUNT(*) as cnt
       FROM active_with_notifs an
       JOIN profiles p ON an.user_id = p.id
       WHERE an.unread > 0
       AND p.last_online > an.earliest_unread
    )
    SELECT
      ROUND(( (SELECT cnt FROM never_read_counts)::numeric / NULLIF(COUNT(*), 0)::numeric ) * 100, 1),
      ROUND(( (SELECT cnt FROM active_ignoring_counts)::numeric / NULLIF(COUNT(*), 0)::numeric ) * 100, 1)
    INTO v_notif_active_users_never_read_percent, v_notif_active_ignoring_percent
    FROM active_with_notifs;

    v_notif_active_users_never_read_percent := COALESCE(v_notif_active_users_never_read_percent, 0);
    v_notif_active_ignoring_percent := COALESCE(v_notif_active_ignoring_percent, 0);


    -- Unread Distribution (ALL TIME unread for Active Users)
    WITH unread_counts AS (
      SELECT
        u.id as user_id,
        (SELECT COUNT(*) FROM notifications n WHERE n.user_id = u.id AND n.is_read = false) as unread_count
      FROM profiles u
      WHERE u.id = ANY(v_active_users_ids)
    ),
    buckets_data AS (
      SELECT
        CASE
          WHEN unread_count = 0 THEN '0'
          WHEN unread_count BETWEEN 1 AND 5 THEN '1-5'
          WHEN unread_count BETWEEN 6 AND 20 THEN '6-20'
          ELSE '20+'
        END as bucket
      FROM unread_counts
    ),
    all_buckets AS (
        SELECT '0' as bucket, 1 as sort_order
        UNION SELECT '1-5', 2
        UNION SELECT '6-20', 3
        UNION SELECT '20+', 4
    )
    SELECT json_agg(json_build_object('bucket', ab.bucket, 'count', COALESCE(bd.cnt, 0)) ORDER BY ab.sort_order)
    INTO v_notif_unread_distribution
    FROM all_buckets ab
    LEFT JOIN (
      SELECT bucket, COUNT(*) as cnt
      FROM buckets_data
      GROUP BY bucket
    ) bd ON ab.bucket = bd.bucket;

    -- Build Object
    v_notification_intelligence := json_build_object(
      'engagement', json_build_object(
        'total_notifications', v_notif_total_notifications,
        'read_rate', v_notif_read_rate,
        'active_users_never_read_percent', v_notif_active_users_never_read_percent,
        'active_ignoring_percent', v_notif_active_ignoring_percent
      ),
      'unread_distribution', v_notif_unread_distribution
    );
  END;

  -- Zone 5: User Leaderboard
  WITH top_reviews AS (
    SELECT l.user_id, p.username, p.avatar_url, COUNT(*) as count
    FROM user_buildings l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND l.content IS NOT NULL AND length(l.content) > 0
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY l.user_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  ),
  top_ratings AS (
    SELECT l.user_id, p.username, p.avatar_url, COUNT(*) as count
    FROM user_buildings l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND l.rating IS NOT NULL
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY l.user_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  ),
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
    WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    ORDER BY t.total_count DESC
    LIMIT 5
  ),
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
      WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      ORDER BY t.total_count DESC
      LIMIT 5
  ),
  top_votes AS (
      SELECT v.user_id, p.username, p.avatar_url, COUNT(*) as count
      FROM poll_votes v
      JOIN profiles p ON v.user_id = p.id
      WHERE v.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      GROUP BY v.user_id, p.username, p.avatar_url
      ORDER BY count DESC
      LIMIT 5
  ),
  top_groups AS (
      SELECT gm.user_id, p.username, p.avatar_url, COUNT(*) as count
      FROM group_members gm
      JOIN profiles p ON gm.user_id = p.id
      WHERE gm.joined_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      GROUP BY gm.user_id, p.username, p.avatar_url
      ORDER BY count DESC
      LIMIT 5
  ),
  top_online AS (
      SELECT p.id as user_id, p.username, p.avatar_url, p.last_online
      FROM profiles p
      WHERE p.last_online IS NOT NULL
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      ORDER BY p.last_online DESC
      LIMIT 5
  ),
  top_follows_given AS (
    SELECT f.follower_id as user_id, p.username, p.avatar_url, COUNT(*) as count
    FROM follows f
    JOIN profiles p ON f.follower_id = p.id
    WHERE f.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY f.follower_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  ),
  top_followers_gained AS (
    SELECT f.following_id as user_id, p.username, p.avatar_url, COUNT(*) as count
    FROM follows f
    JOIN profiles p ON f.following_id = p.id
    WHERE f.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY f.following_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  ),
  top_sessions AS (
    SELECT l.user_id, p.username, p.avatar_url, COUNT(*) as count
    FROM login_logs l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY l.user_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  )
  SELECT json_build_object(
      'most_reviews', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_reviews t), '[]'::json),
      'most_ratings', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_ratings t), '[]'::json),
      'most_likes', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_likes t), '[]'::json),
      'most_comments', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_comments t), '[]'::json),
      'most_votes', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_votes t), '[]'::json),
      'most_groups_joined', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_groups t), '[]'::json),
      'most_recently_online', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_online t), '[]'::json),
      'most_follows_given', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_follows_given t), '[]'::json),
      'most_followers_gained', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_followers_gained t), '[]'::json),
      'most_sessions', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_sessions t), '[]'::json)
  ) INTO v_user_leaderboard;

  -- Zone 6: Retention Analysis
  WITH user_stats AS (
    SELECT
      p.id,
      COALESCE(p.last_online, p.created_at) as last_active_at,
      CASE
        WHEN p.last_online > (NOW() - INTERVAL '30 days') THEN 'active_30d'
        WHEN p.last_online > (NOW() - INTERVAL '90 days') THEN 'active_90d'
        ELSE 'inactive'
      END as status
    FROM profiles p
    WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
  ),
  activity_distribution AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'active_30d') as active_30d,
      COUNT(*) FILTER (WHERE status = 'active_90d') as active_90d,
      COUNT(*) FILTER (WHERE status = 'inactive') as inactive
    FROM user_stats
  ),
  breakdown_30d AS (
    SELECT
      EXTRACT(DAY FROM (NOW() - last_active_at))::int as days_since_active,
      COUNT(*) as user_count
    FROM user_stats
    WHERE status = 'active_30d'
    GROUP BY 1
    ORDER BY 1 ASC
  ),
  recent_users_list AS (
    SELECT p.id as user_id, p.username, p.avatar_url, p.last_online
    FROM profiles p
    WHERE p.last_online IS NOT NULL
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    ORDER BY p.last_online DESC
    LIMIT 50
  )
  SELECT json_build_object(
    'user_activity_distribution', (SELECT row_to_json(ad) FROM activity_distribution ad),
    'active_30d_breakdown', COALESCE((SELECT json_agg(row_to_json(bd)) FROM breakdown_30d bd), '[]'::json),
    'recent_users', COALESCE((SELECT json_agg(row_to_json(ru)) FROM recent_users_list ru), '[]'::json)
  ) INTO v_retention_analysis;

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
      'trending_buildings', COALESCE(v_trending_buildings, '[]'::json)
    ),
    'notification_intelligence', v_notification_intelligence,
    'user_leaderboard', v_user_leaderboard,
    'retention_analysis', v_retention_analysis
  );
END;
$$;


-- 4. search_buildings (Replaces search_films)
-- Clean up old functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT oid::regprocedure AS func_signature
             FROM pg_proc
             WHERE proname IN ('search_films', 'search_films_tiered')
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION search_buildings(
    p_query TEXT DEFAULT NULL,
    p_styles TEXT[] DEFAULT NULL,
    p_architects TEXT[] DEFAULT NULL,
    p_year_min INTEGER DEFAULT NULL,
    p_year_max INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_bucket_list_user_id UUID DEFAULT NULL,
    p_visited_by_user_id UUID DEFAULT NULL,
    p_not_visited_by_user_id UUID DEFAULT NULL,
    p_rated_by_user_ids UUID[] DEFAULT NULL,
    p_min_rating INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    main_image_url TEXT,
    address TEXT,
    year_completed INTEGER,
    architects TEXT[],
    styles TEXT[],
    visit_count BIGINT,
    avg_rating NUMERIC
) AS $$
DECLARE
    v_user_id UUID;
    v_friend_ids UUID[];
BEGIN
    v_user_id := auth.uid();

    -- Get friend IDs for potential relevance sorting (optional future enhancement, keeping structure)
    SELECT ARRAY_AGG(following_id) INTO v_friend_ids
    FROM follows
    WHERE follower_id = v_user_id;

    RETURN QUERY
    SELECT
        b.id,
        b.name,
        b.main_image_url,
        b.address,
        b.year_completed,
        b.architects,
        b.styles,
        (SELECT COUNT(*) FROM user_buildings ub WHERE ub.building_id = b.id AND ub.status = 'visited'::user_building_status) as visit_count,
        (SELECT AVG(rating) FROM user_buildings ub WHERE ub.building_id = b.id AND ub.rating IS NOT NULL) as avg_rating
    FROM buildings b
    WHERE
        (p_query IS NULL OR b.name ILIKE '%' || p_query || '%' OR b.address ILIKE '%' || p_query || '%')
        AND (p_styles IS NULL OR b.styles && p_styles)
        AND (p_architects IS NULL OR b.architects && p_architects)
        AND (p_year_min IS NULL OR b.year_completed >= p_year_min)
        AND (p_year_max IS NULL OR b.year_completed <= p_year_max)
        AND (p_bucket_list_user_id IS NULL OR EXISTS (
            SELECT 1 FROM user_buildings ub WHERE ub.building_id = b.id AND ub.user_id = p_bucket_list_user_id AND ub.status = 'pending'::user_building_status
        ))
        AND (p_visited_by_user_id IS NULL OR EXISTS (
            SELECT 1 FROM user_buildings ub WHERE ub.building_id = b.id AND ub.user_id = p_visited_by_user_id AND ub.status = 'visited'::user_building_status
        ))
        AND (p_not_visited_by_user_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM user_buildings ub WHERE ub.building_id = b.id AND ub.user_id = p_not_visited_by_user_id AND ub.status = 'visited'::user_building_status
        ))
        AND (p_rated_by_user_ids IS NULL OR EXISTS (
            SELECT 1 FROM user_buildings ub WHERE ub.building_id = b.id AND ub.user_id = ANY(p_rated_by_user_ids) AND ub.rating IS NOT NULL
        ))
        AND (p_min_rating IS NULL OR (SELECT AVG(rating) FROM user_buildings ub WHERE ub.building_id = b.id) >= p_min_rating)
    ORDER BY visit_count DESC, avg_rating DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. calculate_scope_stats (Helper for update_group_stats)
-- Update temp table definition first
CREATE OR REPLACE FUNCTION calculate_scope_stats(
    p_group_id uuid,
    p_member_ids uuid[],
    p_filter_building_ids uuid[],
    p_session_dates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_vibe_metrics jsonb;
    v_superlatives jsonb;
    v_content_dna jsonb;
    v_hidden_gems jsonb;
    v_distributions jsonb;
    v_leaderboards jsonb;
    v_compatibility jsonb;

    -- Vibe Vars
    v_avg_rating numeric;
    v_std_dev numeric;
    v_rating_count int;
    v_unique_building_count int;

BEGIN
    -- 1. Vibe Metrics
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs
        WHERE (p_filter_building_ids IS NULL OR building_id = ANY(p_filter_building_ids))
    ),
    stats_agg AS (
        SELECT
            AVG(rating) as avg_rating,
            STDDEV(rating) as std_dev,
            COUNT(*) as rating_count,
            COUNT(DISTINCT building_id) as unique_building_count
        FROM scope_logs
    )
    SELECT
        s.avg_rating, s.std_dev, s.rating_count, s.unique_building_count
    INTO
        v_avg_rating, v_std_dev, v_rating_count, v_unique_building_count
    FROM stats_agg s;

    v_vibe_metrics := jsonb_build_object(
        'avgRating', COALESCE(v_avg_rating, 0),
        'stdDev', COALESCE(v_std_dev, 0),
        'ratingCount', COALESCE(v_rating_count, 0),
        'uniqueBuildingCount', COALESCE(v_unique_building_count, 0)
    );

    -- 2. Superlatives
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs
        WHERE (p_filter_building_ids IS NULL OR building_id = ANY(p_filter_building_ids))
    ),
    member_aggs AS (
        SELECT
            l.user_id,
            p.username,
            p.avatar_url,
            COUNT(*) as count,
            AVG(l.rating) as avg_rating,
            SUM(CASE
                WHEN TRIM(COALESCE(l.content, '')) = '' THEN 0
                ELSE array_length(regexp_split_to_array(TRIM(l.content), '\s+'), 1)
            END) as total_words,
            AVG(LENGTH(COALESCE(l.content, ''))) as avg_length,
            COUNT(l.content) as review_count
        FROM scope_logs l
        JOIN profiles p ON p.id = l.user_id
        GROUP BY l.user_id, p.username, p.avatar_url
    ),
    quickest_draw_calc AS (
        SELECT
            l.user_id,
            AVG(EXTRACT(EPOCH FROM (l.created_at - ((p_session_dates->>l.building_id::text)::date + time '00:00:00') AT TIME ZONE 'UTC'))/3600) as avg_delay_hours,
            COUNT(*) as q_count
        FROM scope_logs l
        WHERE (p_session_dates ? l.building_id::text)
          AND l.created_at >= ((p_session_dates->>l.building_id::text)::date + time '00:00:00') AT TIME ZONE 'UTC'
        GROUP BY l.user_id
        HAVING COUNT(*) >= 2
    ),
    building_sums AS (
        SELECT building_id, SUM(rating) as total_rating, COUNT(*) as total_count FROM scope_logs GROUP BY building_id
    ),
    contrarian_calc AS (
        SELECT
            l.user_id,
            AVG(ABS(l.rating - CASE
                WHEN fs.total_count > 1 THEN (fs.total_rating - l.rating) / (fs.total_count - 1)::numeric
                ELSE l.rating
            END)) as avg_deviation
        FROM scope_logs l
        JOIN building_sums fs ON fs.building_id = l.building_id
        GROUP BY l.user_id
        HAVING COUNT(*) >= 3
    ),
    architect_logs AS (
        SELECT l.user_id, unnest(l.architects) as architect_name
        FROM scope_logs l
    ),
    completist_calc AS (
        SELECT user_id, MAX(b_count) as max_count, (ARRAY_AGG(architect_name ORDER BY b_count DESC))[1] as top_architect
        FROM (SELECT user_id, architect_name, COUNT(*) as b_count FROM architect_logs GROUP BY user_id, architect_name) t
        GROUP BY user_id
    ),
    formatted_superlatives AS (
        SELECT
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', avg_rating, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE count >= 3 ORDER BY avg_rating DESC LIMIT 3) t) as optimist,
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', avg_rating, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE count >= 3 ORDER BY avg_rating ASC LIMIT 3) t) as hater,
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', count, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE count >= 3 ORDER BY count DESC LIMIT 3) t) as prolific,
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', avg_length, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE review_count >= 3 ORDER BY avg_length DESC LIMIT 3) t) as wordsmith,
            (SELECT jsonb_agg(jsonb_build_object('name', username, 'avatar', avatar_url, 'value', total_words, 'id', user_id)) FROM (SELECT * FROM member_aggs WHERE review_count >= 3 ORDER BY total_words DESC LIMIT 3) t) as novelist,
            (SELECT jsonb_agg(jsonb_build_object('name', m.username, 'avatar', m.avatar_url, 'value', q.avg_delay_hours, 'id', m.user_id)) FROM (SELECT * FROM quickest_draw_calc ORDER BY avg_delay_hours ASC LIMIT 3) q JOIN member_aggs m ON m.user_id = q.user_id) as quickestDraw,
            (SELECT jsonb_agg(jsonb_build_object('name', m.username, 'avatar', m.avatar_url, 'value', c.avg_deviation, 'id', m.user_id)) FROM (SELECT * FROM contrarian_calc ORDER BY avg_deviation DESC LIMIT 3) c JOIN member_aggs m ON m.user_id = c.user_id) as contrarian,
            (SELECT jsonb_agg(jsonb_build_object('name', m.username, 'avatar', m.avatar_url, 'value', c.max_count, 'id', m.user_id, 'metadata', c.top_architect)) FROM (SELECT * FROM completist_calc ORDER BY max_count DESC LIMIT 3) c JOIN member_aggs m ON m.user_id = c.user_id) as completist
    )
    SELECT row_to_json(fs)::jsonb INTO v_superlatives FROM formatted_superlatives fs;

    -- 3. Content DNA & Distributions
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs WHERE (p_filter_building_ids IS NULL OR building_id = ANY(p_filter_building_ids))
    ),
    expanded_styles AS (
        SELECT l.user_id, l.rating, unnest(l.styles) as style_name
        FROM scope_logs l
    ),
    style_radar AS (
        SELECT style_name as subject, COALESCE(AVG(rating), 0) as value, 10 as "fullMark"
        FROM expanded_styles
        GROUP BY style_name
        ORDER BY count(*) DESC
        LIMIT 8
    ),
    member_radar AS (
        SELECT user_id, style_name as subject, AVG(rating) as value
        FROM expanded_styles
        WHERE style_name IN (SELECT subject FROM style_radar)
        GROUP BY user_id, style_name
    )
    SELECT jsonb_build_object(
        'styleRadar', (SELECT jsonb_agg(row_to_json(g)) FROM style_radar g),
        'memberRadar', (SELECT jsonb_object_agg(user_id, data) FROM (SELECT user_id, jsonb_agg(jsonb_build_object('subject', subject, 'value', value)) as data FROM member_radar GROUP BY user_id) t)
    ) INTO v_content_dna;

    -- Distributions
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs WHERE (p_filter_building_ids IS NULL OR building_id = ANY(p_filter_building_ids))
    ),
    rating_buckets AS (
        SELECT ROUND(rating) as score, COUNT(*) as count
        FROM scope_logs GROUP BY 1 ORDER BY 1
    )
    SELECT jsonb_build_object(
        'ratings', (SELECT jsonb_agg(jsonb_build_object('score', score, 'count', count)) FROM rating_buckets)
    ) INTO v_distributions;

    -- 4. Hidden Gems
    IF p_filter_building_ids IS NULL THEN
        WITH scope_logs AS (
            SELECT * FROM temp_group_logs WHERE (p_filter_building_ids IS NULL OR building_id = ANY(p_filter_building_ids))
        ),
        gems AS (
            SELECT
                l.building_id, MAX(l.name) as name, MAX(l.main_image_url) as main_image_url, COUNT(*) as count, AVG(l.rating) as avg_rating, array_agg(l.user_id) as fans
            FROM scope_logs l
            WHERE l.rating >= 4 AND NOT (l.building_id::text IN (SELECT key FROM jsonb_each_text(COALESCE(p_session_dates, '{}'::jsonb))))
            GROUP BY l.building_id HAVING COUNT(*) >= 2 ORDER BY count DESC, avg_rating DESC LIMIT 3
        )
        SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count, 'image', main_image_url, 'fans', fans)) INTO v_hidden_gems FROM gems;
    END IF;

    -- 5. Leaderboards (Architects)
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs WHERE (p_filter_building_ids IS NULL OR building_id = ANY(p_filter_building_ids))
    ),
    architects AS (
        SELECT unnest(l.architects) as name, COUNT(*) as count, AVG(l.rating) as avg_rating
        FROM scope_logs l
        GROUP BY 1 HAVING COUNT(*) >= 2 ORDER BY avg_rating DESC LIMIT 10
    )
    SELECT jsonb_build_object(
        'architects', (SELECT jsonb_agg(row_to_json(a)) FROM architects a)
    ) INTO v_leaderboards;

    -- 6. Compatibility
    WITH scope_logs AS (
        SELECT * FROM temp_group_logs WHERE (p_filter_building_ids IS NULL OR building_id = ANY(p_filter_building_ids))
    ),
    pair_stats AS (
        SELECT t1.user_id as u1, t2.user_id as u2, COALESCE(corr(t1.rating, t2.rating), 0) as correlation, count(*) as shared_count
        FROM scope_logs t1 JOIN scope_logs t2 ON t1.building_id = t2.building_id AND t1.user_id < t2.user_id
        GROUP BY t1.user_id, t2.user_id HAVING count(*) >= 3
    ),
    formatted_pairs AS (
        SELECT u1, u2, correlation, (SELECT row_to_json(p) FROM profiles p WHERE p.id = u1) as m1, (SELECT row_to_json(p) FROM profiles p WHERE p.id = u2) as m2
        FROM pair_stats
    ),
    soulmate AS (SELECT * FROM formatted_pairs ORDER BY correlation DESC LIMIT 1),
    nemesis AS (SELECT * FROM formatted_pairs ORDER BY correlation ASC LIMIT 1),
    lone_wolf AS (
        SELECT user_id, AVG(correlation) as score, (SELECT row_to_json(p) FROM profiles p WHERE p.id = user_id) as m
        FROM (SELECT u1 as user_id, correlation FROM pair_stats UNION ALL SELECT u2 as user_id, correlation FROM pair_stats) t
        GROUP BY user_id ORDER BY score ASC LIMIT 1
    )
    SELECT jsonb_build_object(
        'soulmates', (SELECT jsonb_build_object('m1', jsonb_build_object('user', m1), 'm2', jsonb_build_object('user', m2), 'score', correlation) FROM soulmate),
        'nemesis', (SELECT jsonb_build_object('m1', jsonb_build_object('user', m1), 'm2', jsonb_build_object('user', m2), 'score', correlation) FROM nemesis),
        'loneWolf', (SELECT jsonb_build_object('m', jsonb_build_object('user', m), 'score', score) FROM lone_wolf),
        'allPairs', (SELECT jsonb_agg(jsonb_build_object('u1', u1, 'u2', u2, 'score', correlation)) FROM pair_stats)
    ) INTO v_compatibility;

    RETURN jsonb_build_object(
        'vibeMetrics', v_vibe_metrics,
        'superlatives', v_superlatives,
        'contentDNA', v_content_dna,
        'distributions', v_distributions,
        'leaderboards', v_leaderboards,
        'hiddenGems', v_hidden_gems,
        'compatibility', v_compatibility
    );
END;
$$;


-- 6. update_group_stats
CREATE OR REPLACE FUNCTION update_group_stats(target_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Variables for results
    v_member_ids uuid[];
    v_session_building_ids uuid[];
    v_session_building_dates jsonb;
    v_session_count int;

    -- Stats Containers
    v_global_stats jsonb;
    v_session_stats jsonb;
    v_ranking_data jsonb;
    v_this_month_stats jsonb;

    -- Temp vars for calculations
    v_start_of_month timestamptz;
    v_empty_metrics jsonb;

BEGIN
    -- 1. Get Group Members
    SELECT array_agg(user_id) INTO v_member_ids
    FROM group_members
    WHERE group_id = target_group_id;

    -- Defined empty metrics structure to prevent UI stuck state
    v_empty_metrics := jsonb_build_object('avgRating', 0, 'stdDev', 0, 'ratingCount', 0, 'uniqueBuildingCount', 0);

    IF v_member_ids IS NULL THEN
        UPDATE groups
        SET stats_cache = jsonb_build_object(
            'ranking_data', '[]'::jsonb,
            'global', jsonb_build_object('vibeMetrics', v_empty_metrics),
            'session', jsonb_build_object('vibeMetrics', v_empty_metrics),
            'thisMonth', null,
            'sessionCount', 0,
            'updated_at', now(),
            'last_updated', now()
        )
        WHERE id = target_group_id;
        RETURN;
    END IF;

    -- 2. Get Session Buildings and Dates
    WITH session_data AS (
        SELECT
            sb.building_id,
            MIN(gs.session_date) as s_date
        FROM group_sessions gs
        JOIN session_buildings sb ON sb.session_id = gs.id
        WHERE gs.group_id = target_group_id
        GROUP BY sb.building_id
    )
    SELECT
        COALESCE(array_agg(building_id), ARRAY[]::uuid[]),
        jsonb_object_agg(building_id, s_date)
    INTO v_session_building_ids, v_session_building_dates
    FROM session_data;

    IF v_session_building_ids IS NULL THEN v_session_building_ids := ARRAY[]::uuid[]; END IF;
    IF v_session_building_dates IS NULL THEN v_session_building_dates := '{}'::jsonb; END IF;

    -- 3. Get Session Count
    SELECT COUNT(*) INTO v_session_count
    FROM group_sessions
    WHERE group_id = target_group_id;

    -- 4. Prepare Logs
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_group_logs (
        id uuid,
        user_id uuid,
        building_id uuid,
        rating float,
        created_at timestamptz,
        visited_at timestamptz,
        content text,
        year_completed int,
        architects text[],
        styles text[],
        name text,
        main_image_url text
    ) ON COMMIT DROP;

    TRUNCATE temp_group_logs;

    INSERT INTO temp_group_logs
    SELECT DISTINCT ON (l.user_id, l.building_id)
        l.id,
        l.user_id,
        l.building_id,
        l.rating,
        l.created_at,
        l.visited_at,
        l.content,
        b.year_completed,
        b.architects,
        b.styles,
        b.name,
        b.main_image_url
    FROM user_buildings l
    LEFT JOIN buildings b ON b.id = l.building_id
    WHERE l.user_id = ANY(v_member_ids)
    AND l.rating IS NOT NULL
    ORDER BY l.user_id, l.building_id, l.created_at DESC;

    -- 5. Calculate Global Ranking Data (Sparkline)
    SELECT jsonb_agg(t) INTO v_ranking_data
    FROM (
        SELECT
            building_id,
            MAX(name) as name,
            AVG(rating) as avg_rating,
            COUNT(id) as review_count
        FROM temp_group_logs
        WHERE building_id = ANY(v_session_building_ids)
        GROUP BY building_id
        HAVING COUNT(id) >= 2
        ORDER BY avg_rating DESC
    ) t;

    -- Calculate Stats
    v_global_stats := (SELECT calculate_scope_stats(target_group_id, v_member_ids, NULL, v_session_building_dates));
    v_session_stats := (SELECT calculate_scope_stats(target_group_id, v_member_ids, v_session_building_ids, v_session_building_dates));

    -- Calculate This Month Stats
    v_start_of_month := date_trunc('month', now());

    WITH monthly_logs AS (
        SELECT * FROM temp_group_logs
        WHERE created_at >= v_start_of_month
    ),
    contributor AS (
        SELECT user_id, COUNT(*) as count
        FROM monthly_logs
        GROUP BY user_id
        ORDER BY count DESC LIMIT 1
    ),
    reviewer AS (
         SELECT user_id, SUM(array_length(regexp_split_to_array(TRIM(COALESCE(content, '')), '\s+'), 1)) as total_words
        FROM monthly_logs
        WHERE content IS NOT NULL
        GROUP BY user_id
        ORDER BY total_words DESC LIMIT 1
    ),
    trending AS (
        SELECT building_id, MAX(name) as name, MAX(main_image_url) as main_image_url, COUNT(*) as count
        FROM monthly_logs
        GROUP BY building_id
        ORDER BY count DESC, MAX(created_at) DESC LIMIT 1
    )
    SELECT jsonb_build_object(
        'contributor', (SELECT jsonb_build_object('member', (SELECT row_to_json(p) FROM profiles p WHERE p.id = c.user_id), 'value', c.count) FROM contributor c),
        'reviewer', (SELECT jsonb_build_object('member', (SELECT row_to_json(p) FROM profiles p WHERE p.id = r.user_id), 'value', r.total_words) FROM reviewer r),
        'trending', (SELECT jsonb_build_object('name', t.name, 'image', t.main_image_url, 'count', t.count) FROM trending t)
    ) INTO v_this_month_stats;

    -- Final Update
    UPDATE groups
    SET stats_cache = jsonb_build_object(
        'ranking_data', COALESCE(v_ranking_data, '[]'::jsonb),
        'global', v_global_stats,
        'session', v_session_stats,
        'thisMonth', v_this_month_stats,
        'sessionCount', COALESCE(v_session_count, 0),
        'updated_at', now(),
        'last_updated', now()
    )
    WHERE id = target_group_id;

    TRUNCATE temp_group_logs;
END;
$$;
