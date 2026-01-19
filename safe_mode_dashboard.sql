-- Safe Mode Dashboard Stats
-- Returns empty/zero values for all metrics to prevent frontend crashes during outage.
-- Preserves the ORIGINAL nested structure (Zone 3 & 4) which the old frontend likely expects.

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'pulse', json_build_object(
      'total_users', 0,
      'new_users_30d', 0,
      'active_users_24h', 0,
      'active_users_30d', 0,
      'network_density', 0
    ),
    'activity_trends', '[]'::json,
    -- The Old Frontend likely expects objects here, not arrays.
    'group_dynamics', json_build_object(
      'hot_groups', '[]'::json,
      'session_reliability', json_build_object('published_count', 0, 'completed_count', 0)
    ),
    'content_intelligence', json_build_object(
      'trending_films', '[]'::json
    ),
    -- These might not exist in the old frontend, but including them as null/empty is safer than omitting if it checks for keys.
    'user_leaderboard', json_build_object(
        'most_reviews', '[]'::json,
        'most_ratings', '[]'::json,
        'most_likes', '[]'::json,
        'most_comments', '[]'::json,
        'most_votes', '[]'::json,
        'most_groups_joined', '[]'::json,
        'most_recently_online', '[]'::json,
        'most_follows_given', '[]'::json,
        'most_followers_gained', '[]'::json,
        'most_sessions', '[]'::json
    ),
    'retention_analysis', json_build_object(
        'user_activity_distribution', json_build_object('active_30d', 0, 'active_90d', 0, 'inactive', 0),
        'active_30d_breakdown', '[]'::json,
        'recent_users', '[]'::json
    )
  );
END;
$$;
