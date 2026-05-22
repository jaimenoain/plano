import { useEffect, useState } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { Search } from "lucide-react";
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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { adminNavGroups } from "@/features/admin/components/adminNavItems";

export const meta: MetaFunction = () => [
  { title: "Admin | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const goTo = (url: string) => {
    setPaletteOpen(false);
    navigate(url);
  };

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">Admin Dashboard</h1>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex h-10 w-full items-center gap-2 rounded-sm border border-border-default bg-surface-muted px-3 text-sm text-text-secondary transition-colors duration-200 hover:border-border-strong hover:shadow-sm focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary sm:w-80"
            aria-label="Search admin pages"
          >
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <span className="flex-1 text-left">Search admin pages...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border-default bg-surface-default px-1.5 font-mono text-[10px] font-medium text-text-secondary sm:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
          <CommandInput placeholder="Search admin pages..." />
          <CommandList>
            <CommandEmpty>No pages found.</CommandEmpty>
            {adminNavGroups.map(({ label, items }) => (
              <CommandGroup key={label} heading={label}>
                {items.map((item) => (
                  <CommandItem
                    key={item.url}
                    value={`${label} ${item.title} ${item.url}`}
                    onSelect={() => goTo(item.url)}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-text-secondary" />
                    <span>{item.title}</span>
                    <CommandShortcut>{item.url}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>

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
