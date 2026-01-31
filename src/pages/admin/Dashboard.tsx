import { useEffect, useState } from "react";
import { fetchAdminDashboardStats } from "@/api/admin";
import { DashboardStats } from "@/types/admin";
import { BottomNav } from "@/components/layout/BottomNav";
import { PulseZone } from "@/components/admin/PulseZone";
import { PhotoHeatmapZone } from "@/components/admin/PhotoHeatmapZone";
import { ActivityTrendsZone } from "@/components/admin/ActivityTrendsZone";
import { GroupDynamicsZone } from "@/components/admin/GroupDynamicsZone";
import { ContentIntelligenceZone } from "@/components/admin/ContentIntelligenceZone";
import { UserLeaderboardZone } from "@/components/admin/UserLeaderboardZone";
import { RetentionZone } from "@/components/admin/RetentionZone";
import { SessionDiagnosticZone } from "@/components/admin/SessionDiagnosticZone";
import { NotificationIntelligenceZone } from "@/components/admin/NotificationIntelligenceZone";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchAdminDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Zone 1: The Pulse */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">The Pulse</h2>
          <PulseZone stats={stats.pulse} />
        </section>

        {/* Zone 1.2: Global Photo Distribution */}
        <section className="space-y-4">
          <PhotoHeatmapZone data={stats.heatmap_data} />
        </section>

        {/* Zone 1.5: Retention Analysis */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">User Retention</h2>
          <RetentionZone data={stats.retention_analysis} />
        </section>

        {/* Zone 2: Activity Trends */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Activity Trends</h2>
          <ActivityTrendsZone data={stats.activity_trends} />
        </section>

        {/* Zone 3: Group Dynamics */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Group Dynamics</h2>
          <GroupDynamicsZone
            hotGroups={stats.group_dynamics.hot_groups}
            sessionReliability={stats.group_dynamics.session_reliability}
          />
        </section>

        {/* Zone 4: Content Intelligence */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Content Intelligence</h2>
          <ContentIntelligenceZone trendingBuildings={stats.content_intelligence.trending_buildings} />
        </section>

        {/* Zone 4.5: Notification Intelligence */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Notification Intelligence</h2>
          <NotificationIntelligenceZone data={stats.notification_intelligence} />
        </section>

        {/* Zone 5: User Leaderboard */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">User Leaderboard</h2>
          <UserLeaderboardZone data={stats.user_leaderboard} />
        </section>

        {/* Zone 6: Session Diagnostics & Health */}
        <section className="space-y-4">
          <SessionDiagnosticZone />
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
