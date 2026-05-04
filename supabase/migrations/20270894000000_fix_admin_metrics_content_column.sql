-- Fix Admin Dashboard RPCs after migration of content to building_posts table.
-- The column user_buildings.content was dropped in 20270872000000_building_posts.sql
-- but the admin functions were not updated.

BEGIN;

-- 1. Update get_admin_pulse
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

  -- UPDATED: Use building_posts instead of user_buildings.content
  SELECT COUNT(*) INTO v_total_reviews
  FROM building_posts bp
  JOIN profiles p ON bp.user_id = p.id
  WHERE bp.body IS NOT NULL
    AND length(trim(bp.body)) > 0
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

-- 2. Update get_admin_leaderboards
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

  -- UPDATED: Use building_posts instead of user_buildings.content
  WITH top_reviews AS (
    SELECT bp.user_id, p.username, p.avatar_url, COUNT(*) AS count
    FROM building_posts bp
    JOIN profiles p ON bp.user_id = p.id
    WHERE bp.created_at > (NOW() - INTERVAL '30 days')
      AND bp.body IS NOT NULL AND length(trim(bp.body)) > 0
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY bp.user_id, p.username, p.avatar_url
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

COMMIT;
