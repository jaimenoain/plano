import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Flame,
  History,
  Camera,
  MapPin,
  Building2,
  Users,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  EmbassyPageHeader,
  EmbassyEmptyState,
  EmbassyErrorState,
  EMBASSY_SKELETON_ROUNDED,
} from "@/features/embassy/components/embassy-ui";
import {
  fetchMyImpact,
  summarizeImpactTotals,
  type ImpactMetric,
  type ImpactTimelineEntry,
} from "@/features/embassy/api/impact";
// Relative, not "@/features/embassy/...": the alias form trips the deep-feature
// import ratchet even inside the owning feature.
import { MilestoneShelf } from "../components/MilestoneShelf";

const TIMELINE_ICONS: Record<ImpactMetric, LucideIcon> = {
  edits: History,
  photos: Camera,
  visits: MapPin,
  firms_claimed: Building2,
  moderation: History,
  outreach: Users,
  events: CalendarDays,
  research: History,
};

export default function MyImpactPage() {
  const { user } = useAuth();

  const impactQuery = useQuery({
    queryKey: ["embassy-my-impact", user?.id],
    queryFn: fetchMyImpact,
    enabled: !!user,
    staleTime: 30_000,
  });

  const impact = impactQuery.data;
  const summary = impact ? summarizeImpactTotals(impact.totals) : [];
  const hasAnyActivity = impact ? summary.some((s) => s.count > 0) : false;

  return (
    <div className="space-y-12 pb-20">
      <EmbassyPageHeader
        eyebrow="My impact"
        title="Your contributions"
        description="Everything you've done for your chapter, in one place."
      />

      {impactQuery.isLoading ? (
        <div className="space-y-8">
          <Skeleton className={cn("h-20 w-full", EMBASSY_SKELETON_ROUNDED)} />
          <div className="grid gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className={cn("h-28 w-full", EMBASSY_SKELETON_ROUNDED)} />
            ))}
          </div>
          <Skeleton className={cn("h-64 w-full", EMBASSY_SKELETON_ROUNDED)} />
        </div>
      ) : impactQuery.isError ? (
        <EmbassyErrorState message="Could not load your impact right now. Try again in a moment." />
      ) : !impact || !hasAnyActivity ? (
        <EmbassyEmptyState
          title="No contributions yet"
          description="Once you research, photograph, moderate, or reach out, your totals and streak will show up here."
        >
          <Button variant="outline" size="sm" asChild>
            <Link to="/embassy/goals">Find something to do</Link>
          </Button>
        </EmbassyEmptyState>
      ) : (
        <>
          <StreakBanner weeklyStreak={impact.weeklyStreak} />

          {/* Inside the has-activity branch on purpose: an all-zero shelf is noise for an
              ambassador who hasn't started yet — the empty state above is the better ask. */}
          <MilestoneShelf />

          <section className="space-y-4" aria-labelledby="my-impact-totals-heading">
            <h2 id="my-impact-totals-heading" className="text-lg font-semibold text-text-primary">
              Totals
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summary.map((s) => (
                <Card key={s.metric} className="border border-border-default rounded-sm p-4 space-y-2">
                  <p className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
                    {s.label}
                  </p>
                  <p className="text-2xl font-semibold text-text-primary tabular-nums">{s.count}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="my-impact-timeline-heading">
            <h2 id="my-impact-timeline-heading" className="text-lg font-semibold text-text-primary">
              Timeline
            </h2>
            {impact.timeline.length === 0 ? (
              <p className="text-sm text-text-secondary py-4">No recent activity logged.</p>
            ) : (
              <div className="space-y-3">
                {impact.timeline.map((item, i) => (
                  <TimelineRow key={`${item.type}-${item.occurredAt}-${i}`} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StreakBanner({ weeklyStreak }: { weeklyStreak: number }) {
  const active = weeklyStreak > 0;
  return (
    <div className="flex items-center gap-3 rounded-sm border border-border-default p-4">
      <Flame
        className={active ? "h-6 w-6 text-feedback-warning" : "h-6 w-6 text-text-disabled"}
        aria-hidden
      />
      <p className="text-sm font-medium text-text-primary">
        {active
          ? `${weeklyStreak}-week streak — keep it going.`
          : "Start a streak — contribute something this week."}
      </p>
    </div>
  );
}

function TimelineRow({ item }: { item: ImpactTimelineEntry }) {
  const Icon = TIMELINE_ICONS[item.type] ?? History;
  return (
    <div className="flex items-center gap-4 p-3 rounded-sm border hover:bg-surface-muted/50 transition-colors">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-text-primary">{item.label}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
