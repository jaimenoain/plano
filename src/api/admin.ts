import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "@/types/admin";

export async function fetchAdminDashboardStats(): Promise<DashboardStats> {
  const { data: rpcData, error } = await supabase.rpc('get_admin_dashboard_stats');

  if (error) {
    console.error("Failed to fetch admin stats:", error);
    throw error;
  }

  if (!rpcData) {
    throw new Error("No data returned from admin stats RPC");
  }

  const stats = rpcData as unknown as DashboardStats;

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
