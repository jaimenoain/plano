import { supabase } from "@/integrations/supabase/client";
import { DashboardStats, PhotoCoverageStats, TopPhotoBuilding, ZeroPhotoBuilding } from "@/features/admin/types/admin";

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
}

function parsePulseJson(raw: unknown): DashboardStats["pulse"] {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    total_users: num(o.total_users),
    new_users_30d: num(o.new_users_30d),
    new_users_24h: num(o.new_users_24h),
    active_users_24h: num(o.active_users_24h),
    active_users_30d: num(o.active_users_30d),
    network_density: num(o.network_density),
    total_buildings: num(o.total_buildings),
    total_reviews: num(o.total_reviews),
    total_photos: num(o.total_photos),
    pending_reports: num(o.pending_reports),
  };
}

function firstErrorMessage(label: string, error: { message: string } | null): string | null {
  return error ? `${label}: ${error.message}` : null;
}

function normalizeActivityTrends(raw: unknown): DashboardStats["activity_trends"] {
  const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const actionsIn = Array.isArray(t.actions) ? t.actions : [];
  const loginsIn = Array.isArray(t.logins) ? t.logins : [];
  const dauIn = Array.isArray(t.dau_by_feature) ? t.dau_by_feature : [];
  return {
    actions: actionsIn.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        date: String(r.date ?? ""),
        logs: num(r.logs),
        comments: num(r.comments),
        likes: num(r.likes),
        follows: num(r.follows),
      };
    }),
    logins: loginsIn.map((row) => {
      const r = row as Record<string, unknown>;
      return { date: String(r.date ?? ""), count: num(r.count) };
    }),
    dau_by_feature: dauIn.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        date: String(r.date ?? ""),
        logs_users: num(r.logs_users),
        comments_users: num(r.comments_users),
        likes_users: num(r.likes_users),
        visited_users: num(r.visited_users),
      };
    }),
  };
}

export async function fetchAdminDashboardStats(): Promise<DashboardStats> {
  const [
    pulseRes,
    trendsRes,
    leaderboardsRes,
    contentRes,
    retentionRes,
    notificationsRes,
  ] = await Promise.all([
    supabase.rpc("get_admin_pulse"),
    supabase.rpc("get_admin_trends"),
    supabase.rpc("get_admin_leaderboards"),
    supabase.rpc("get_admin_content_stats"),
    supabase.rpc("get_admin_retention"),
    supabase.rpc("get_admin_notifications"),
  ]);

  const errors = [
    firstErrorMessage("get_admin_pulse", pulseRes.error),
    firstErrorMessage("get_admin_trends", trendsRes.error),
    firstErrorMessage("get_admin_leaderboards", leaderboardsRes.error),
    firstErrorMessage("get_admin_content_stats", contentRes.error),
    firstErrorMessage("get_admin_retention", retentionRes.error),
    firstErrorMessage("get_admin_notifications", notificationsRes.error),
  ].filter(Boolean) as string[];

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const pulse = parsePulseJson(pulseRes.data);

  const trends = trendsRes.data != null ? normalizeActivityTrends(trendsRes.data) : { actions: [], logins: [], dau_by_feature: [] };

  const leaderboards =
    (leaderboardsRes.data as unknown as DashboardStats["user_leaderboard"] | null) ?? {
      most_reviews: [],
      most_ratings: [],
      most_likes: [],
      most_comments: [],
      most_recently_online: [],
      most_follows_given: [],
      most_followers_gained: [],
    };

  const content =
    (contentRes.data as unknown as { content_intelligence: DashboardStats["content_intelligence"] } | null) ?? {
      content_intelligence: { trending_buildings: [] },
    };

  const retention =
    (retentionRes.data as unknown as DashboardStats["retention_analysis"] | null) ?? {
      user_activity_distribution: { active_30d: 0, active_90d: 0, inactive: 0 },
      active_30d_breakdown: [],
      recent_users: [],
    };

  const notifications =
    (notificationsRes.data as unknown as DashboardStats["notification_intelligence"] | null) ?? {
      engagement: {
        total_notifications: 0,
        read_rate: 0,
        active_users_never_read_percent: 0,
        active_ignoring_percent: 0,
      },
      unread_distribution: [],
    };

  return {
    pulse,
    activity_trends: trends,
    content_intelligence: content.content_intelligence,
    user_leaderboard: leaderboards,
    retention_analysis: retention,
    notification_intelligence: notifications,
  };
}

export async function fetchPhotoCoverageStats(): Promise<PhotoCoverageStats> {
  const { data, error } = await supabase.rpc("get_photo_coverage_stats");
  if (error || !data?.[0]) {
    return { total_photos: 0, buildings_with_photos: 0, buildings_without_photos: 0, total_buildings: 0 };
  }
  return data[0] as PhotoCoverageStats;
}

export async function fetchTopPhotoBuildings(limit = 50): Promise<TopPhotoBuilding[]> {
  const { data, error } = await supabase.rpc("get_top_photo_buildings", { p_limit: limit });
  if (error) return [];
  return (data as unknown as TopPhotoBuilding[]) || [];
}

export async function fetchZeroPhotoBuildings(limit = 500): Promise<ZeroPhotoBuilding[]> {
  const { data, error } = await supabase.rpc("get_zero_photo_buildings", { p_limit: limit });
  if (error) return [];
  return (data as unknown as ZeroPhotoBuilding[]) || [];
}
