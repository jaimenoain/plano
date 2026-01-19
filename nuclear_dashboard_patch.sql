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
      'new_users_24h', 0,
      'active_users_24h', 0,
      'active_users_30d', 0,
      'network_density', 0
    ),
    'activity_trends', NULL,
    'group_dynamics', NULL,
    'content_intelligence', NULL,
    'user_leaderboard', NULL,
    'retention_analysis', NULL,
    'retention', NULL
  );
END;
$$;
