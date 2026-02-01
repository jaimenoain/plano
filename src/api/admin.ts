import { supabase } from "@/integrations/supabase/client";
import { DashboardStats, HeatmapPoint } from "@/types/admin";

export async function fetchAdminDashboardStats(): Promise<DashboardStats> {
  // Parallel RPC calls to avoid single transaction timeout
  const [
    { data: pulseData, error: pulseError },
    { data: trendsData, error: trendsError },
    { data: leaderboardsData, error: leaderboardsError },
    { data: contentData, error: contentError },
    { data: retentionData, error: retentionError },
    { data: notificationsData, error: notificationsError },
    // Direct queries for counts
    { count: totalBuildings, error: buildingsError },
    { count: totalReviews, error: reviewsError },
    { count: totalPhotos, error: photosError },
    { count: pendingReports, error: reportsError },
  ] = await Promise.all([
    supabase.rpc('get_admin_pulse'),
    supabase.rpc('get_admin_trends'),
    supabase.rpc('get_admin_leaderboards'),
    supabase.rpc('get_admin_content_stats'),
    supabase.rpc('get_admin_retention'),
    supabase.rpc('get_admin_notifications'),
    supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('user_buildings').select('*', { count: 'exact', head: true }).not('content', 'is', null),
    supabase.from('buildings').select('*', { count: 'exact', head: true }).not('main_image_url', 'is', null).eq('is_deleted', false),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  if (pulseError) console.error("Pulse Error:", pulseError);
  if (trendsError) console.error("Trends Error:", trendsError);
  if (leaderboardsError) console.error("Leaderboards Error:", leaderboardsError);
  if (contentError) console.error("Content Error:", contentError);
  if (retentionError) console.error("Retention Error:", retentionError);
  if (notificationsError) console.error("Notifications Error:", notificationsError);

  if (buildingsError) console.error("Failed to count buildings", buildingsError);
  if (reviewsError) console.error("Failed to count reviews", reviewsError);
  if (photosError) console.error("Failed to count photos", photosError);
  if (reportsError) console.error("Failed to count reports", reportsError);

  // Fallbacks using 'as any' to bypass initial strict typing, validated by return type
  const pulse = (pulseData as any) || {
    total_users: 0,
    new_users_30d: 0,
    active_users_24h: 0,
    active_users_30d: 0,
    network_density: 0
  };

  const trends = (trendsData as any) || {
    actions: [],
    logins: [],
    dau_by_feature: []
  };

  const leaderboards = (leaderboardsData as any) || {
    most_reviews: [],
    most_ratings: [],
    most_likes: [],
    most_comments: [],
    most_votes: [],
    most_groups_joined: [],
    most_recently_online: [],
    most_follows_given: [],
    most_followers_gained: [],
    most_sessions: []
  };

  const content = (contentData as any) || {
    group_dynamics: { hot_groups: [], session_reliability: { published_count: 0, completed_count: 0 } },
    content_intelligence: { trending_buildings: [] }
  };

  const retention = (retentionData as any) || {
    user_activity_distribution: { active_30d: 0, active_90d: 0, inactive: 0 },
    active_30d_breakdown: [],
    recent_users: []
  };

  const notifications = (notificationsData as any) || {
    engagement: {
      total_notifications: 0,
      read_rate: 0,
      active_users_never_read_percent: 0,
      active_ignoring_percent: 0
    },
    unread_distribution: []
  };

  const stats: DashboardStats = {
    pulse: {
      ...pulse,
      total_buildings: totalBuildings || 0,
      total_reviews: totalReviews || 0,
      total_photos: totalPhotos || 0,
      pending_reports: pendingReports || 0,
    },
    activity_trends: trends,
    group_dynamics: content.group_dynamics,
    content_intelligence: content.content_intelligence,
    user_leaderboard: leaderboards,
    retention_analysis: retention,
    notification_intelligence: notifications,
  };

  return stats;
}

export async function fetchPhotoHeatmapData(): Promise<HeatmapPoint[]> {
  const { data, error } = await supabase.rpc('get_photo_heatmap_data' as any);

  if (error) {
    console.error("Heatmap Error:", error);
    return [];
  }

  return (data as any[]) || [];
}
