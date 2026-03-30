import { supabase } from "@/integrations/supabase/client";
import { DashboardStats, HeatmapPoint } from "@/features/admin/types/admin";

export async function fetchAdminDashboardStats(): Promise<DashboardStats> {
  // Parallel RPC calls to avoid single transaction timeout
  const [
    { data: pulseData, error: _pulseError },
    { data: trendsData, error: _trendsError },
    { data: leaderboardsData, error: _leaderboardsError },
    { data: contentData, error: _contentError },
    { data: retentionData, error: _retentionError },
    { data: notificationsData, error: _notificationsError },
    // Direct queries for counts
    { count: totalBuildings, error: _buildingsError },
    { count: totalReviews, error: _reviewsError },
    { count: totalPhotos, error: _photosError },
    { count: pendingReports, error: _reportsError },
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

  const pulse =
    (pulseData as unknown as DashboardStats["pulse"] | null) ?? {
    total_users: 0,
    new_users_30d: 0,
    new_users_24h: 0,
    active_users_24h: 0,
    active_users_30d: 0,
    network_density: 0,
    total_buildings: 0,
    total_reviews: 0,
    total_photos: 0,
    pending_reports: 0,
  };

  const trends =
    (trendsData as unknown as DashboardStats["activity_trends"] | null) ?? {
    actions: [],
    logins: [],
    dau_by_feature: [],
  };

  const leaderboards =
    (leaderboardsData as unknown as DashboardStats["user_leaderboard"] | null) ?? {
    most_reviews: [],
    most_ratings: [],
    most_likes: [],
    most_comments: [],
    most_votes: [],
    most_recently_online: [],
    most_follows_given: [],
    most_followers_gained: [],
  };

  const content =
    (contentData as unknown as { content_intelligence: DashboardStats["content_intelligence"] } | null) ?? {
    content_intelligence: { trending_buildings: [] },
  };

  const retention =
    (retentionData as unknown as DashboardStats["retention_analysis"] | null) ?? {
    user_activity_distribution: { active_30d: 0, active_90d: 0, inactive: 0 },
    active_30d_breakdown: [],
    recent_users: [],
  };

  const notifications =
    (notificationsData as unknown as DashboardStats["notification_intelligence"] | null) ?? {
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
    content_intelligence: content.content_intelligence,
    user_leaderboard: leaderboards,
    retention_analysis: retention,
    notification_intelligence: notifications,
  };

  return stats;
}

export async function fetchPhotoHeatmapData(): Promise<HeatmapPoint[]> {
  const { data, error } = await supabase.rpc("get_photo_heatmap_data");

  if (error) {
    return [];
  }

  return (data as unknown as HeatmapPoint[]) || [];
}
