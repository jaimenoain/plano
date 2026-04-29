-- Admin dashboard: accurate pulse counts (SECURITY DEFINER, not RLS-limited REST),
-- new_users_24h, retention buckets using last activity proxy, trending images via
-- main_image_url(buildings), trends JSON without retired vote series, leaderboards
-- aligned with trimmed dashboard (no vote leaderboard), notifications active-user fix,
-- is_admin() includes app_admin, optional admin read-all policy on user_buildings.

CREATE OR REPLACE FUNCTION public.get_admin_pulse()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users BIGINT;
  v_new_users_30d BIGINT;
  v_new_users_24h BIGINT;
  v_active_users_24h BIGINT;
  v_active_users_30d BIGINT;
  v_total_follows BIGINT;
  v_network_density NUMERIC;
  v_total_buildings BIGINT;
  v_total_reviews BIGINT;
  v_total_photos BIGINT;
  v_pending_reports BIGINT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT COUNT(*) INTO v_total_users FROM profiles WHERE (role IS DISTINCT FROM 'test_user' AND role IS DISTINCT FROM 'admin');

  SELECT COUNT(*) INTO v_new_users_30d
  FROM profiles
  WHERE created_at > (NOW() - INTERVAL '30 days')
    AND (role IS DISTINCT FROM 'test_user' AND role IS DISTINCT FROM 'admin');

  SELECT COUNT(*) INTO v_new_users_24h
  FROM profiles
  WHERE created_at > (NOW() - INTERVAL '24 hours')
    AND (role IS DISTINCT FROM 'test_user' AND role IS DISTINCT FROM 'admin');

  WITH active_24h AS (
    SELECT user_id FROM user_buildings WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION SELECT user_id FROM comments WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION SELECT user_id FROM likes WHERE created_at > (NOW() - INTERVAL '24 hours')
    UNION SELECT user_id FROM comment_likes WHERE created_at > (NOW() - INTERVAL '24 hours')
  )
  SELECT COUNT(DISTINCT a.user_id) INTO v_active_users_24h
  FROM active_24h a
  JOIN profiles p ON a.user_id = p.id
  WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin');

  WITH active_30d AS (
    SELECT user_id FROM user_buildings WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION SELECT user_id FROM comments WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION SELECT user_id FROM likes WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION SELECT user_id FROM comment_likes WHERE created_at > (NOW() - INTERVAL '30 days')
  )
  SELECT COUNT(DISTINCT a.user_id) INTO v_active_users_30d
  FROM active_30d a
  JOIN profiles p ON a.user_id = p.id
  WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin');

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

  SELECT COUNT(*) INTO v_total_buildings
  FROM buildings
  WHERE COALESCE(is_deleted, false) = false;

  SELECT COUNT(*) INTO v_total_reviews
  FROM user_buildings ub
  JOIN profiles p ON ub.user_id = p.id
  WHERE ub.content IS NOT NULL
    AND length(trim(ub.content)) > 0
    AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin');

  SELECT COUNT(*) INTO v_total_photos
  FROM buildings b
  WHERE COALESCE(b.is_deleted, false) = false
    AND b.hero_image_url IS NOT NULL
    AND length(trim(b.hero_image_url)) > 0;

  SELECT COUNT(*) INTO v_pending_reports
  FROM reports r
  WHERE r.status = 'pending';

  RETURN json_build_object(
    'total_users', v_total_users,
    'new_users_30d', v_new_users_30d,
    'new_users_24h', v_new_users_24h,
    'active_users_24h', v_active_users_24h,
    'active_users_30d', v_active_users_30d,
    'network_density', v_network_density,
    'total_buildings', v_total_buildings,
    'total_reviews', v_total_reviews,
    'total_photos', v_total_photos,
    'pending_reports', v_pending_reports
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_retention()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention_analysis json;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  WITH user_stats AS (
    SELECT
      p.id,
      COALESCE(p.last_online, p.created_at) AS last_active_at,
      CASE
        WHEN COALESCE(p.last_online, p.created_at) > (NOW() - INTERVAL '30 days') THEN 'active_30d'
        WHEN COALESCE(p.last_online, p.created_at) > (NOW() - INTERVAL '90 days') THEN 'active_90d'
        ELSE 'inactive'
      END AS status
    FROM profiles p
    WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
  ),
  activity_distribution AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'active_30d') AS active_30d,
      COUNT(*) FILTER (WHERE status = 'active_90d') AS active_90d,
      COUNT(*) FILTER (WHERE status = 'inactive') AS inactive
    FROM user_stats
  ),
  breakdown_30d AS (
    SELECT
      EXTRACT(DAY FROM (NOW() - last_active_at))::int AS days_since_active,
      COUNT(*) AS user_count
    FROM user_stats
    WHERE status = 'active_30d'
    GROUP BY 1
    ORDER BY 1 ASC
  ),
  recent_users_list AS (
    SELECT p.id AS user_id, p.username, p.avatar_url, p.last_online
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

  RETURN v_retention_analysis;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_content_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trending_buildings json;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  WITH trending AS (
    SELECT
      l.building_id,
      max(b.name) AS name,
      max(public.main_image_url(b)) AS main_image_url,
      max(b.hero_image_url) AS hero_image_url,
      COUNT(*)::bigint AS visit_count
    FROM user_buildings l
    JOIN buildings b ON l.building_id = b.id
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '7 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY l.building_id
    ORDER BY visit_count DESC
    LIMIT 5
  )
  SELECT json_agg(row_to_json(t)) INTO v_trending_buildings FROM trending t;

  RETURN json_build_object(
    'content_intelligence', json_build_object(
      'trending_buildings', COALESCE(v_trending_buildings, '[]'::json)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_trends()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actions json;
  v_logins json;
  v_dau_by_feature json;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  WITH dates AS (
    SELECT generate_series((NOW() - INTERVAL '29 days')::date, NOW()::date, '1 day'::interval)::date AS day
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
    SELECT c.created_at::date AS day, COUNT(*) AS cnt
    FROM comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
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
      SELECT ck.created_at::date AS day, COUNT(*) AS cnt
      FROM comment_likes ck
      JOIN profiles p ON ck.user_id = p.id
      WHERE ck.created_at > (NOW() - INTERVAL '30 days')
        AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      GROUP BY 1
    ) sub GROUP BY 1
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
    'follows', COALESCE(f.cnt, 0)
  )) INTO v_actions
  FROM dates d
  LEFT JOIN daily_logs l ON d.day = l.day
  LEFT JOIN daily_comments c ON d.day = c.day
  LEFT JOIN daily_likes k ON d.day = k.day
  LEFT JOIN daily_follows f ON d.day = f.day;

  WITH dates AS (
    SELECT generate_series((NOW() - INTERVAL '29 days')::date, NOW()::date, '1 day'::interval)::date AS day
  ),
  daily_logins AS (
    SELECT l.created_at::date AS day, COUNT(*) AS cnt
    FROM login_logs l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  )
  SELECT json_agg(json_build_object('date', d.day, 'count', COALESCE(l.cnt, 0))) INTO v_logins
  FROM dates d
  LEFT JOIN daily_logins l ON d.day = l.day;

  WITH dates AS (
    SELECT generate_series((NOW() - INTERVAL '29 days')::date, NOW()::date, '1 day'::interval)::date AS day
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
    SELECT c.created_at::date AS day, COUNT(DISTINCT c.user_id) AS cnt
    FROM comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY 1
  ),
  daily_likes_users AS (
    SELECT day, COUNT(DISTINCT user_id) AS cnt FROM (
      SELECT k.created_at::date AS day, k.user_id
      FROM likes k
      JOIN profiles p ON k.user_id = p.id
      WHERE k.created_at > (NOW() - INTERVAL '30 days')
        AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
      UNION ALL
      SELECT ck.created_at::date AS day, ck.user_id
      FROM comment_likes ck
      JOIN profiles p ON ck.user_id = p.id
      WHERE ck.created_at > (NOW() - INTERVAL '30 days')
        AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    ) sub GROUP BY 1
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
    'visited_users', COALESCE(vis.cnt, 0)
  )) INTO v_dau_by_feature
  FROM dates d
  LEFT JOIN daily_logs_users l ON d.day = l.day
  LEFT JOIN daily_comments_users c ON d.day = c.day
  LEFT JOIN daily_likes_users k ON d.day = k.day
  LEFT JOIN daily_visitors vis ON d.day = vis.day;

  RETURN json_build_object(
    'actions', COALESCE(v_actions, '[]'::json),
    'logins', COALESCE(v_logins, '[]'::json),
    'dau_by_feature', COALESCE(v_dau_by_feature, '[]'::json)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_leaderboards()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_leaderboard json;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  WITH top_reviews AS (
    SELECT l.user_id, p.username, p.avatar_url, COUNT(*) AS count
    FROM user_buildings l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '30 days')
      AND l.content IS NOT NULL AND length(trim(l.content)) > 0
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY l.user_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  ),
  top_ratings AS (
    SELECT l.user_id, p.username, p.avatar_url, COUNT(*) AS count
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
    SELECT user_id, SUM(cnt) AS total_count FROM (
      SELECT user_id, COUNT(*) AS cnt FROM likes WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY user_id
      UNION ALL
      SELECT user_id, COUNT(*) AS cnt FROM comment_likes WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY user_id
    ) sub
    GROUP BY user_id
  ),
  top_likes AS (
    SELECT t.user_id, p.username, p.avatar_url, t.total_count AS count
    FROM top_likes_agg t
    JOIN profiles p ON t.user_id = p.id
    WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    ORDER BY t.total_count DESC
    LIMIT 5
  ),
  top_comments_agg AS (
    SELECT user_id, SUM(cnt) AS total_count FROM (
      SELECT user_id, COUNT(*) AS cnt FROM comments WHERE created_at > (NOW() - INTERVAL '30 days') GROUP BY user_id
    ) sub
    GROUP BY user_id
  ),
  top_comments AS (
    SELECT t.user_id, p.username, p.avatar_url, t.total_count AS count
    FROM top_comments_agg t
    JOIN profiles p ON t.user_id = p.id
    WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    ORDER BY t.total_count DESC
    LIMIT 5
  ),
  top_online AS (
    SELECT p.id AS user_id, p.username, p.avatar_url, p.last_online
    FROM profiles p
    WHERE p.last_online IS NOT NULL
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    ORDER BY p.last_online DESC
    LIMIT 5
  ),
  top_follows_given AS (
    SELECT f.follower_id AS user_id, p.username, p.avatar_url, COUNT(*) AS count
    FROM follows f
    JOIN profiles p ON f.follower_id = p.id
    WHERE f.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY f.follower_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  ),
  top_followers_gained AS (
    SELECT f.following_id AS user_id, p.username, p.avatar_url, COUNT(*) AS count
    FROM follows f
    JOIN profiles p ON f.following_id = p.id
    WHERE f.created_at > (NOW() - INTERVAL '30 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY f.following_id, p.username, p.avatar_url
    ORDER BY count DESC
    LIMIT 5
  )
  SELECT json_build_object(
    'most_reviews', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_reviews t), '[]'::json),
    'most_ratings', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_ratings t), '[]'::json),
    'most_likes', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_likes t), '[]'::json),
    'most_comments', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_comments t), '[]'::json),
    'most_recently_online', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_online t), '[]'::json),
    'most_follows_given', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_follows_given t), '[]'::json),
    'most_followers_gained', COALESCE((SELECT json_agg(row_to_json(t)) FROM top_followers_gained t), '[]'::json)
  ) INTO v_user_leaderboard;

  RETURN v_user_leaderboard;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_notifications()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif_total_notifications BIGINT;
  v_notif_read_notifications BIGINT;
  v_notif_read_rate NUMERIC;
  v_notif_active_users_never_read_percent NUMERIC;
  v_notif_active_ignoring_percent NUMERIC;
  v_notif_unread_distribution json;
  v_active_users_ids UUID[];
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

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

  WITH active_30d_ids AS (
    SELECT user_id FROM user_buildings WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION SELECT user_id FROM comments WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION SELECT user_id FROM likes WHERE created_at > (NOW() - INTERVAL '30 days')
    UNION SELECT user_id FROM comment_likes WHERE created_at > (NOW() - INTERVAL '30 days')
  )
  SELECT array_agg(DISTINCT a.user_id) INTO v_active_users_ids
  FROM active_30d_ids a
  JOIN profiles p ON a.user_id = p.id
  WHERE (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin');

  v_active_users_ids := COALESCE(v_active_users_ids, ARRAY[]::uuid[]);

  WITH user_notifs_30d AS (
    SELECT
      n.user_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE n.is_read = false) AS unread,
      MIN(n.created_at) FILTER (WHERE n.is_read = false) AS earliest_unread
    FROM notifications n
    WHERE n.created_at > (NOW() - INTERVAL '30 days')
      AND n.user_id = ANY(v_active_users_ids)
    GROUP BY n.user_id
  ),
  active_with_notifs AS (
    SELECT * FROM user_notifs_30d
  ),
  never_read_counts AS (
    SELECT COUNT(*) AS cnt FROM active_with_notifs WHERE unread = total
  ),
  active_ignoring_counts AS (
    SELECT COUNT(*) AS cnt
    FROM active_with_notifs an
    JOIN profiles p ON an.user_id = p.id
    WHERE an.unread > 0
      AND p.last_online > an.earliest_unread
  )
  SELECT
    ROUND(((SELECT cnt FROM never_read_counts)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 1),
    ROUND(((SELECT cnt FROM active_ignoring_counts)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 1)
  INTO v_notif_active_users_never_read_percent, v_notif_active_ignoring_percent
  FROM active_with_notifs;

  v_notif_active_users_never_read_percent := COALESCE(v_notif_active_users_never_read_percent, 0);
  v_notif_active_ignoring_percent := COALESCE(v_notif_active_ignoring_percent, 0);

  WITH unread_counts AS (
    SELECT
      u.id AS user_id,
      (SELECT COUNT(*) FROM notifications n WHERE n.user_id = u.id AND n.is_read = false) AS unread_count
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
      END AS bucket
    FROM unread_counts
  ),
  all_buckets AS (
    SELECT '0' AS bucket, 1 AS sort_order
    UNION SELECT '1-5', 2
    UNION SELECT '6-20', 3
    UNION SELECT '20+', 4
  )
  SELECT json_agg(json_build_object('bucket', ab.bucket, 'count', COALESCE(bd.cnt, 0)) ORDER BY ab.sort_order)
  INTO v_notif_unread_distribution
  FROM all_buckets ab
  LEFT JOIN (
    SELECT bucket, COUNT(*) AS cnt
    FROM buckets_data
    GROUP BY bucket
  ) bd ON ab.bucket = bd.bucket;

  RETURN json_build_object(
    'engagement', json_build_object(
      'total_notifications', v_notif_total_notifications,
      'read_rate', v_notif_read_rate,
      'active_users_never_read_percent', v_notif_active_users_never_read_percent,
      'active_ignoring_percent', v_notif_active_ignoring_percent
    ),
    'unread_distribution', COALESCE(v_notif_unread_distribution, '[]'::json)
  );
END;
$$;

-- Admins can read all building interaction rows (moderation / analytics). Complements the
-- visibility policy for normal users; permissive policies are OR-combined.
DROP POLICY IF EXISTS "Admins can view all user_buildings for moderation" ON public.user_buildings;
CREATE POLICY "Admins can view all user_buildings for moderation"
  ON public.user_buildings
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Align SQL helper with client `AdminGuard`: both full admin roles may use admin RPCs and policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'app_admin')
  );
END;
$$;
