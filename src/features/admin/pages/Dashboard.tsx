import { useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import { fetchAdminDashboardStats } from "@/features/admin/api/admin";
import { DashboardStats } from "@/features/admin/types/admin";
import { PulseZone } from "@/features/admin/components/PulseZone";
import { ActivityTrendsZone } from "@/features/admin/components/ActivityTrendsZone";
import { ContentIntelligenceZone } from "@/features/admin/components/ContentIntelligenceZone";
import { UserLeaderboardZone } from "@/features/admin/components/UserLeaderboardZone";
import { RetentionZone } from "@/features/admin/components/RetentionZone";
import { SessionDiagnosticZone } from "@/features/admin/components/SessionDiagnosticZone";
import { NotificationIntelligenceZone } from "@/features/admin/components/NotificationIntelligenceZone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const meta: MetaFunction = () => [
  { title: "Admin | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      setLoadError(null);
      try {
        const data = await fetchAdminDashboardStats();
        setStats(data);
      } catch (e: unknown) {
        setStats(null);
        setLoadError(e instanceof Error ? e.message : "Failed to load dashboard data.");
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
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-feedback-destructive text-center max-w-lg">{loadError ?? "Failed to load dashboard data."}</p>
        <p className="text-sm text-text-secondary text-center max-w-md">
          If this mentions a missing column or function, apply the latest admin dashboard migration in the Supabase SQL
          Editor, then reload.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-12">
            {/* Zone 1: The Pulse */}
            <section className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary">The Pulse</h2>
              <PulseZone stats={stats.pulse} />
            </section>

            {/* Zone 1.5: Retention Analysis */}
            <section className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary">User Retention</h2>
              <RetentionZone data={stats.retention_analysis} />
            </section>

            {/* Zone 2: Activity Trends */}
            <section className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Activity Trends</h2>
              <ActivityTrendsZone data={stats.activity_trends} />
            </section>

            {/* Zone 4: Content Intelligence */}
            <section className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Content Intelligence</h2>
              <ContentIntelligenceZone trendingBuildings={stats.content_intelligence.trending_buildings} />
            </section>

            {/* Zone 4.5: Notification Intelligence */}
            <section className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Notification Intelligence</h2>
              <NotificationIntelligenceZone data={stats.notification_intelligence} />
            </section>

            {/* Zone 5: User Leaderboard */}
            <section className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary">User Leaderboard</h2>
              <UserLeaderboardZone data={stats.user_leaderboard} />
            </section>

            {/* Zone 6: Session Diagnostics & Health */}
            <section className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Diagnostics & Health</h2>
              <SessionDiagnosticZone />
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
