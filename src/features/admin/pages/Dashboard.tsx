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
import { AdminPageHeader, AdminSectionLabel } from "@/features/admin/components/admin-ui";

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
      <div className="space-y-8">
        <AdminPageHeader
          title="Dashboard"
          actions={
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex h-10 w-full items-center gap-2 rounded-sm border border-border-default bg-surface-muted px-3 text-sm text-text-secondary transition-colors hover:border-border-strong focus-visible:border-brand-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary sm:w-80"
              aria-label="Search admin pages"
            >
              <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
              <span className="flex-1 text-left">Search admin pages…</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border-default bg-surface-default px-1.5 font-mono text-[10px] font-medium text-text-secondary sm:inline-flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          }
        />

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
          <TabsList className="h-auto gap-4 border-b border-border-default bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-12">
            {/* Zone 1: The Pulse */}
            <section className="space-y-4">
              <AdminSectionLabel>The pulse</AdminSectionLabel>
              <PulseZone stats={stats.pulse} />
            </section>

            {/* Zone 1.5: Retention Analysis */}
            <section className="space-y-4">
              <AdminSectionLabel>User retention</AdminSectionLabel>
              <RetentionZone data={stats.retention_analysis} />
            </section>

            {/* Zone 2: Activity Trends */}
            <section className="space-y-4">
              <AdminSectionLabel>Activity trends</AdminSectionLabel>
              <ActivityTrendsZone data={stats.activity_trends} />
            </section>

            {/* Zone 4: Content Intelligence */}
            <section className="space-y-4">
              <AdminSectionLabel>Content intelligence</AdminSectionLabel>
              <ContentIntelligenceZone trendingBuildings={stats.content_intelligence.trending_buildings} />
            </section>

            {/* Zone 4.5: Notification Intelligence */}
            <section className="space-y-4">
              <AdminSectionLabel>Notification intelligence</AdminSectionLabel>
              <NotificationIntelligenceZone data={stats.notification_intelligence} />
            </section>

            {/* Zone 5: User Leaderboard */}
            <section className="space-y-4">
              <AdminSectionLabel>User leaderboard</AdminSectionLabel>
              <UserLeaderboardZone data={stats.user_leaderboard} />
            </section>

            {/* Zone 6: Session Diagnostics & Health */}
            <section className="space-y-4">
              <AdminSectionLabel>Diagnostics & health</AdminSectionLabel>
              <SessionDiagnosticZone />
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
