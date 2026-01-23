-- Security Audit Fixes: Harden Admin Security
-- 1. Secure RPCs (merge_buildings, get_potential_duplicates, get_admin_dashboard_stats)
-- 2. Prevent Privilege Escalation (Profile Role Updates)
-- 3. Enable Admin Access to Reports

-- Ensure dependencies are met
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optimize duplicate detection
CREATE INDEX IF NOT EXISTS idx_buildings_name_trgm ON buildings USING gin (name gin_trgm_ops);

-- ==============================================================================
-- 1. SECURE RPCs
-- ==============================================================================

-- Function 1: get_potential_duplicates
CREATE OR REPLACE FUNCTION get_potential_duplicates(
  limit_count INT DEFAULT 50,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id1 UUID,
  name1 TEXT,
  id2 UUID,
  name2 TEXT,
  score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT
    b1.id AS id1,
    b1.name AS name1,
    b2.id AS id2,
    b2.name AS name2,
    similarity(b1.name, b2.name)::FLOAT AS score
  FROM buildings b1
  JOIN buildings b2 ON b1.id < b2.id
  WHERE
    b1.is_deleted = false
    AND b2.is_deleted = false
    AND similarity(b1.name, b2.name) > similarity_threshold
  ORDER BY score DESC
  LIMIT limit_count;
END;
$$;

-- Function 2: merge_buildings
CREATE OR REPLACE FUNCTION merge_buildings(
  master_id UUID,
  duplicate_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    dup_opt RECORD;
    master_opt_id UUID;
BEGIN
  -- Security Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

  -- 1. Migrate User Logs (user_buildings)
  -- For logs where user has reviewed Duplicate but NOT Master, move them to Master.
  UPDATE user_buildings
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND user_id NOT IN (
    SELECT user_id FROM user_buildings WHERE building_id = master_id
  );

  -- For logs where user reviewed BOTH, delete the Duplicate log (keep Master).
  DELETE FROM user_buildings
  WHERE building_id = duplicate_id;

  -- 2. Migrate Recommendations
  UPDATE recommendations
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM recommendations r2
    WHERE r2.building_id = master_id
    AND r2.recipient_id = recommendations.recipient_id
    AND r2.recommender_id = recommendations.recommender_id
  );

  DELETE FROM recommendations WHERE building_id = duplicate_id;

  -- 3. Migrate Watchlist Notifications
  UPDATE watchlist_notifications
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM watchlist_notifications w2
    WHERE w2.building_id = master_id
    AND w2.user_id = watchlist_notifications.user_id
    AND w2.provider_name = watchlist_notifications.provider_name
  );

  DELETE FROM watchlist_notifications WHERE building_id = duplicate_id;

  -- 4. Migrate Session Buildings
  UPDATE session_buildings
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM session_buildings s2
    WHERE s2.building_id = master_id
    AND s2.session_id = session_buildings.session_id
  );

  DELETE FROM session_buildings WHERE building_id = duplicate_id;

  -- 5. Migrate Group Backlog Items
  UPDATE group_backlog_items
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM group_backlog_items g2
    WHERE g2.building_id = master_id
    AND g2.group_id = group_backlog_items.group_id
  );

  DELETE FROM group_backlog_items WHERE building_id = duplicate_id;

  -- 6. Migrate Film Availability (just delete duplicates, scraper will handle master)
  DELETE FROM film_availability WHERE building_id = duplicate_id;

  -- 7. Poll Options
  -- Loop through options of duplicate building
  FOR dup_opt IN
      SELECT * FROM poll_options WHERE building_id = duplicate_id
  LOOP
      -- Check if master building is already an option in the same question
      SELECT id INTO master_opt_id
      FROM poll_options
      WHERE question_id = dup_opt.question_id
      AND building_id = master_id;

      IF master_opt_id IS NOT NULL THEN
          -- Master option exists. Move votes.
          UPDATE poll_votes SET option_id = master_opt_id WHERE option_id = dup_opt.id;
          -- Delete duplicate option
          DELETE FROM poll_options WHERE id = dup_opt.id;
      ELSE
          -- No master option. Safe to update building_id.
          UPDATE poll_options SET building_id = master_id WHERE id = dup_opt.id;
      END IF;
  END LOOP;

  -- 8. Soft Delete Duplicate Building
  UPDATE buildings
  SET is_deleted = true
  WHERE id = duplicate_id;

END;
$$;

-- Function 3: get_admin_dashboard_stats
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
  -- Security Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required.';
  END IF;

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


-- ==============================================================================
-- 2. PREVENT PRIVILEGE ESCALATION
-- ==============================================================================

-- Trigger to protect role changes
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if role is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if user is admin (using the existing helper)
    IF NOT public.is_admin() THEN
       RAISE EXCEPTION 'Access denied: You cannot change your own role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update_check ON profiles;

CREATE TRIGGER on_profile_update_check
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_update();


-- ==============================================================================
-- 3. ENABLE ADMIN ACCESS TO REPORTS
-- ==============================================================================

-- Ensure RLS is enabled
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Enable Admin access to reports
CREATE POLICY "Admins can view reports" ON reports
    FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can update reports" ON reports
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete reports" ON reports
    FOR DELETE
    USING (public.is_admin());
