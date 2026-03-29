-- Phase 11: Remove social groups, group sessions, polls, and related DB objects.
-- Apply only after backup. Idempotent where possible (IF EXISTS).
-- (Supabase runs the migration file in a single transaction.)

-- =============================================================================
-- 1) Replace application RPCs that referenced group / poll / session tables
-- =============================================================================

-- --- merge_buildings: drop group session / backlog / poll handling ---
CREATE OR REPLACE FUNCTION merge_buildings(source_id UUID, target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  building_snapshot JSONB;
  conflict_record RECORD;
  target_ub_id UUID;
  admin_user_id UUID;
BEGIN
  IF source_id = target_id THEN
    RAISE EXCEPTION 'Cannot merge a building into itself.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM buildings WHERE id = source_id) THEN
    RAISE EXCEPTION 'Source building not found.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM buildings WHERE id = target_id) THEN
    RAISE EXCEPTION 'Target building not found.';
  END IF;

  SELECT row_to_json(b) INTO building_snapshot FROM buildings b WHERE id = source_id;
  admin_user_id := auth.uid();

  FOR conflict_record IN
    SELECT ub.id, ub.user_id, ub.content, ub.rating
    FROM user_buildings ub
    WHERE ub.building_id = source_id
      AND EXISTS (
        SELECT 1 FROM user_buildings ub2
        WHERE ub2.building_id = target_id AND ub2.user_id = ub.user_id
      )
  LOOP
    SELECT id INTO target_ub_id
    FROM user_buildings
    WHERE building_id = target_id AND user_id = conflict_record.user_id;

    UPDATE user_buildings
    SET content = conflict_record.content,
        rating = COALESCE(rating, conflict_record.rating)
    WHERE id = target_ub_id
      AND (content IS NULL OR content = '');

    UPDATE review_images
    SET review_id = target_ub_id
    WHERE review_id = conflict_record.id;

    DELETE FROM user_buildings WHERE id = conflict_record.id;
  END LOOP;

  UPDATE user_buildings
  SET building_id = target_id
  WHERE building_id = source_id;

  UPDATE recommendations
  SET building_id = target_id
  WHERE building_id = source_id
    AND NOT EXISTS (
      SELECT 1 FROM recommendations r2
      WHERE r2.building_id = target_id
        AND r2.recipient_id = recommendations.recipient_id
        AND r2.recommender_id = recommendations.recommender_id
    );
  DELETE FROM recommendations WHERE building_id = source_id;

  INSERT INTO building_architects (building_id, architect_id)
  SELECT target_id, architect_id
  FROM building_architects
  WHERE building_id = source_id
  ON CONFLICT (building_id, architect_id) DO NOTHING;

  DELETE FROM building_architects WHERE building_id = source_id;

  UPDATE buildings
  SET is_deleted = true,
      merged_into_id = target_id
  WHERE id = source_id;

  INSERT INTO admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    details
  ) VALUES (
    admin_user_id,
    'MERGE_BUILDINGS',
    'building',
    target_id::text,
    json_build_object(
      'source_id', source_id,
      'source_snapshot', building_snapshot,
      'timestamp', now()
    )
  );
END;
$$;

-- --- Feed & suggestions: remove group_id from return shape ---
CREATE OR REPLACE FUNCTION get_feed(p_limit INT, p_offset INT)
RETURNS TABLE (
  id UUID,
  content TEXT,
  rating INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  status TEXT,
  user_id UUID,
  building_id UUID,
  user_data JSONB,
  building_data JSONB,
  likes_count BIGINT,
  comments_count BIGINT,
  is_liked BOOLEAN,
  review_images JSONB
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT
    ub.id,
    ub.content,
    ub.rating,
    ub.tags,
    ub.created_at,
    ub.edited_at,
    ub.status::TEXT,
    ub.user_id,
    ub.building_id,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified_architect', EXISTS (SELECT 1 FROM architect_claims ac WHERE ac.user_id = p.id AND ac.status = 'verified'),
      'is_architect_of_building', EXISTS (
        SELECT 1
        FROM architect_claims ac
        JOIN building_architects ba ON ac.architect_id = ba.architect_id
        WHERE ac.user_id = p.id
          AND ac.status = 'verified'
          AND ba.building_id = ub.building_id
      )
    ) AS user_data,
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'main_image_url', NULL,
      'address', b.address,
      'architects', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', a.name, 'id', a.id)), '[]'::jsonb)
        FROM building_architects ba
        JOIN architects a ON ba.architect_id = a.id
        WHERE ba.building_id = b.id
      ),
      'year_completed', b.year_completed,
      'city', b.city,
      'country', b.country,
      'slug', b.slug,
      'short_id', b.short_id
    ) AS building_data,
    (SELECT COUNT(*) FROM likes l WHERE l.interaction_id = ub.id) AS likes_count,
    (SELECT COUNT(*) FROM comments c WHERE c.interaction_id = ub.id) AS comments_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.interaction_id = ub.id AND l.user_id = v_user_id) AS is_liked,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'storage_path', ri.storage_path,
            'likes_count', ri.likes_count,
            'is_liked', EXISTS(SELECT 1 FROM image_likes il WHERE il.image_id = ri.id AND il.user_id = v_user_id)
          )
        )
        FROM review_images ri
        WHERE ri.review_id = ub.id
      ),
      '[]'::jsonb
    ) AS review_images
  FROM user_buildings ub
  LEFT JOIN profiles p ON ub.user_id = p.id
  LEFT JOIN buildings b ON ub.building_id = b.id
  WHERE
    (ub.user_id IN (SELECT following_id FROM follows WHERE follower_id = v_user_id)
     OR ub.user_id = v_user_id)
    AND ub.status != 'ignored'
  ORDER BY COALESCE(ub.edited_at, ub.created_at) DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION get_suggested_posts(p_limit INT, p_offset INT)
RETURNS TABLE (
  id UUID,
  content TEXT,
  rating INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  status TEXT,
  user_id UUID,
  building_id UUID,
  user_data JSONB,
  building_data JSONB,
  likes_count BIGINT,
  comments_count BIGINT,
  is_liked BOOLEAN,
  is_suggested BOOLEAN,
  suggestion_reason TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH calculated_posts AS (
    SELECT
      ub.id,
      ub.content,
      ub.rating,
      ub.tags,
      ub.created_at,
      ub.edited_at,
      ub.status,
      ub.user_id,
      ub.building_id,
      (SELECT COUNT(*) FROM likes l WHERE l.interaction_id = ub.id) AS likes_count,
      (SELECT COUNT(*) FROM comments c WHERE c.interaction_id = ub.id) AS comments_count,
      EXISTS (SELECT 1 FROM likes l WHERE l.interaction_id = ub.id AND l.user_id = v_user_id) AS is_liked
    FROM user_buildings ub
    LEFT JOIN buildings b ON ub.building_id = b.id
    WHERE
      ub.user_id != v_user_id
      AND ub.user_id NOT IN (SELECT following_id FROM follows WHERE follower_id = v_user_id)
      AND ub.status NOT IN ('ignored', 'hidden')
      AND (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
  )
  SELECT
    cp.id,
    cp.content,
    cp.rating,
    cp.tags,
    cp.created_at,
    cp.edited_at,
    cp.status::TEXT,
    cp.user_id,
    cp.building_id,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url
    ) AS user_data,
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'main_image_url', b.main_image_url,
      'address', b.address,
      'architects', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', a.name, 'id', a.id)), '[]'::jsonb)
        FROM building_architects ba
        JOIN architects a ON ba.architect_id = a.id
        WHERE ba.building_id = b.id
      ),
      'year_completed', b.year_completed,
      'city', b.city,
      'country', b.country,
      'slug', b.slug,
      'short_id', b.short_id
    ) AS building_data,
    cp.likes_count,
    cp.comments_count,
    cp.is_liked,
    TRUE AS is_suggested,
    'Popular'::TEXT AS suggestion_reason
  FROM calculated_posts cp
  LEFT JOIN profiles p ON cp.user_id = p.id
  LEFT JOIN buildings b ON cp.building_id = b.id
  ORDER BY
    ((COALESCE(cp.rating, 0) * 2) + cp.likes_count) DESC,
    cp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- --- Connect suggestions: keep group_mutual_count column (always 0) for API compatibility ---
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
  my_hides AS (
    SELECT suggested_user_id FROM suggested_profile_hides WHERE user_id = v_current_user_id
  ),
  candidate_scores AS (
    SELECT
      p.id,
      p.username,
      p.avatar_url,
      EXISTS (
        SELECT 1 FROM follows WHERE follower_id = p.id AND following_id = v_current_user_id
      ) AS is_follows_me,
      (
        COALESCE((
          SELECT COUNT(*)
          FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id
          WHERE f1.follower_id = v_current_user_id
            AND f2.following_id = p.id
        ), 0) * 10
      ) + (
        CASE WHEN EXISTS (
          SELECT 1 FROM follows WHERE follower_id = p.id AND following_id = v_current_user_id
        ) THEN 5 ELSE 0 END
      ) + (
        (SELECT COUNT(*)::numeric FROM follows WHERE following_id = p.id) * 0.1
      ) AS score,
      COALESCE((
        SELECT COUNT(*)
        FROM follows f1
        JOIN follows f2 ON f1.following_id = f2.follower_id
        WHERE f1.follower_id = v_current_user_id
          AND f2.following_id = p.id
      ), 0) AS mutual_count
    FROM profiles p
    WHERE p.id != v_current_user_id
      AND NOT EXISTS (SELECT 1 FROM my_follows mf WHERE mf.following_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM my_hides mh WHERE mh.suggested_user_id = p.id)
  )
  SELECT
    cs.id,
    cs.username,
    cs.avatar_url,
    cs.mutual_count,
    cs.is_follows_me,
    0::bigint AS group_mutual_count
  FROM candidate_scores cs
  ORDER BY cs.score DESC
  LIMIT p_limit;
END;
$$;

-- --- Admin: pulse (no poll / group session activity) ---
CREATE OR REPLACE FUNCTION get_admin_pulse()
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
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT COUNT(*) INTO v_total_users FROM profiles WHERE (role IS DISTINCT FROM 'test_user' AND role IS DISTINCT FROM 'admin');

  SELECT COUNT(*) INTO v_new_users_30d
  FROM profiles
  WHERE created_at > (NOW() - INTERVAL '30 days')
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

  RETURN json_build_object(
    'total_users', v_total_users,
    'new_users_30d', v_new_users_30d,
    'active_users_24h', v_active_users_24h,
    'active_users_30d', v_active_users_30d,
    'network_density', v_network_density
  );
END;
$$;

-- --- Admin: trends (votes series = 0; no poll/session tables) ---
CREATE OR REPLACE FUNCTION get_admin_trends()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    'votes', 0,
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
    'votes_users', 0,
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

-- --- Admin: leaderboards (no polls / groups / login-streak bucket) ---
CREATE OR REPLACE FUNCTION get_admin_leaderboards()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
      AND l.content IS NOT NULL AND length(l.content) > 0
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

-- --- Admin: content stats (trending buildings only; aligns with web dashboard) ---
CREATE OR REPLACE FUNCTION get_admin_content_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trending_buildings json;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  WITH trending AS (
    SELECT
      l.building_id,
      b.name,
      b.main_image_url,
      COUNT(*)::bigint AS visit_count
    FROM user_buildings l
    JOIN buildings b ON l.building_id = b.id
    JOIN profiles p ON l.user_id = p.id
    WHERE l.created_at > (NOW() - INTERVAL '7 days')
      AND (p.role IS DISTINCT FROM 'test_user' AND p.role IS DISTINCT FROM 'admin')
    GROUP BY l.building_id, b.name, b.main_image_url
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

-- --- Admin: notifications intelligence (no poll / group session activity union) ---
CREATE OR REPLACE FUNCTION get_admin_notifications()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    'unread_distribution', v_notif_unread_distribution
  );
END;
$$;

-- =============================================================================
-- 2) Drop group-only RPCs & slug helpers (after dependents replaced)
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_user_groups_summary(uuid, text, int);
DROP FUNCTION IF EXISTS public.get_group_building_stats(uuid, uuid[]);
DROP FUNCTION IF EXISTS public.get_group_building_stats(uuid, text[]);

DROP TRIGGER IF EXISTS trigger_set_group_slug ON public.groups;
DROP FUNCTION IF EXISTS public.set_group_slug();
DROP FUNCTION IF EXISTS public.generate_unique_slug(text, uuid);

-- =============================================================================
-- 3) Notifications: remove rows that use retired types, then tighten CHECK
-- =============================================================================

DELETE FROM public.notifications
WHERE type IN (
  'new_session',
  'group_invitation',
  'session_reminder',
  'group_activity',
  'join_request'
);

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'follow',
      'like',
      'comment',
      'recommendation',
      'friend_joined',
      'suggest_follow',
      'visit_request',
      'architect_verification'
    )
  );

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_group_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_session_id_fkey;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS group_id;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS session_id;

-- =============================================================================
-- 4) user_buildings: drop group scope column
-- =============================================================================

ALTER TABLE public.user_buildings DROP CONSTRAINT IF EXISTS log_group_id_fkey;
ALTER TABLE public.user_buildings DROP COLUMN IF EXISTS group_id;

-- =============================================================================
-- 5) Drop group / poll / session tables (children first; CASCADE for safety)
-- =============================================================================

DROP TABLE IF EXISTS public.poll_votes CASCADE;
DROP TABLE IF EXISTS public.poll_options CASCADE;
DROP TABLE IF EXISTS public.poll_questions CASCADE;
DROP TABLE IF EXISTS public.polls CASCADE;

DROP TABLE IF EXISTS public.session_likes CASCADE;
DROP TABLE IF EXISTS public.session_comments CASCADE;
DROP TABLE IF EXISTS public.session_buildings CASCADE;

DROP TABLE IF EXISTS public.group_backlog_items CASCADE;
DROP TABLE IF EXISTS public.group_sessions CASCADE;
DROP TABLE IF EXISTS public.group_cycles CASCADE;
DROP TABLE IF EXISTS public.group_private_info CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
