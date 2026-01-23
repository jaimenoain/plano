import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "@/types/admin";

export async function fetchAdminDashboardStats(): Promise<DashboardStats> {
  // 1. Start RPC call
  const rpcPromise = supabase.rpc('get_admin_dashboard_stats');

  // 2. Start parallel queries for new metrics
  const buildingsPromise = supabase.from('buildings').select('*', { count: 'exact', head: true });
  // Reviews: logs with content
  const reviewsPromise = supabase.from('user_buildings').select('*', { count: 'exact', head: true }).not('content', 'is', null);
  // Photos: buildings with main image
  const photosPromise = supabase.from('buildings').select('*', { count: 'exact', head: true }).not('main_image_url', 'is', null);
  // Pending Reports
  const reportsPromise = supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');

  const [
    { data: rpcData, error: rpcError },
    { count: totalBuildings, error: buildingsError },
    { count: totalReviews, error: reviewsError },
    { count: totalPhotos, error: photosError },
    { count: pendingReports, error: reportsError }
  ] = await Promise.all([
    rpcPromise,
    buildingsPromise,
    reviewsPromise,
    photosPromise,
    reportsPromise
  ]);

  if (rpcError) {
    console.error("Failed to fetch admin stats:", rpcError);
    throw rpcError;
  }

  if (!rpcData) {
    throw new Error("No data returned from admin stats RPC");
  }

  const stats = rpcData as unknown as DashboardStats;

  // Log errors for supplementary data
  if (buildingsError) console.error("Failed to count buildings", buildingsError);
  if (reviewsError) console.error("Failed to count reviews", reviewsError);
  if (photosError) console.error("Failed to count photos", photosError);
  if (reportsError) console.error("Failed to count reports", reportsError);

  // Merge new metrics
  stats.pulse.total_buildings = totalBuildings || 0;
  stats.pulse.total_reviews = totalReviews || 0;
  stats.pulse.total_photos = totalPhotos || 0;
  stats.pulse.pending_reports = pendingReports || 0;

  // Graceful fallback if RPC hasn't been updated yet
  if (!stats.notification_intelligence) {
      console.warn("notification_intelligence missing from RPC, returning default zeroed stats");
      stats.notification_intelligence = {
          engagement: {
              total_notifications: 0,
              read_rate: 0,
              active_users_never_read_percent: 0,
              active_ignoring_percent: 0
          },
          unread_distribution: [
             { bucket: "0", count: 0 },
             { bucket: "1-5", count: 0 },
             { bucket: "6-20", count: 0 },
             { bucket: "20+", count: 0 }
          ]
      };
  }

  return stats;
}
