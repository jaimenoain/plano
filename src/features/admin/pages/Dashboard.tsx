import { useEffect, useState } from "react";
import { fetchAdminDashboardStats } from "@/features/admin/api/admin";
import { DashboardStats } from "@/features/admin/types/admin";
import { BottomNav } from "@/components/layout/BottomNav";
import { PulseZone } from "@/features/admin/components/PulseZone";
import { ActivityTrendsZone } from "@/features/admin/components/ActivityTrendsZone";
import { ContentIntelligenceZone } from "@/features/admin/components/ContentIntelligenceZone";
import { UserLeaderboardZone } from "@/features/admin/components/UserLeaderboardZone";
import { RetentionZone } from "@/features/admin/components/RetentionZone";
import { SessionDiagnosticZone } from "@/features/admin/components/SessionDiagnosticZone";
import { NotificationIntelligenceZone } from "@/features/admin/components/NotificationIntelligenceZone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchAdminDashboardStats();
        setStats(data);
      } catch (_error) {
} finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-default flex items-center justify-center">
        <p className="text-text-secondary">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-surface-default flex items-center justify-center">
        <p className="text-feedback-destructive">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-default pb-20">
      <div className="container p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text-primary">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Zone 1: The Pulse */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">The Pulse</h2>
              <PulseZone stats={stats.pulse} />
            </section>

            {/* Zone 1.5: Retention Analysis */}
            <section className="mt-12 pt-8 border-t border-border-default space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">User Retention</h2>
              <RetentionZone data={stats.retention_analysis} />
            </section>

            {/* Zone 2: Activity Trends */}
            <section className="mt-12 pt-8 border-t border-border-default space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">Activity Trends</h2>
              <ActivityTrendsZone data={stats.activity_trends} />
            </section>

            {/* Zone 4: Content Intelligence */}
            <section className="mt-12 pt-8 border-t border-border-default space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">Content Intelligence</h2>
              <ContentIntelligenceZone trendingBuildings={stats.content_intelligence.trending_buildings} />
            </section>

            {/* Zone 4.5: Notification Intelligence */}
            <section className="mt-12 pt-8 border-t border-border-default space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">Notification Intelligence</h2>
              <NotificationIntelligenceZone data={stats.notification_intelligence} />
            </section>

            {/* Zone 5: User Leaderboard */}
            <section className="mt-12 pt-8 border-t border-border-default space-y-4">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">User Leaderboard</h2>
              <UserLeaderboardZone data={stats.user_leaderboard} />
            </section>

            {/* Zone 6: Session Diagnostics & Health */}
            <section className="mt-12 pt-8 border-t border-border-default space-y-4">
              <SessionDiagnosticZone />
            </section>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}
