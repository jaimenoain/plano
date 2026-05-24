import { type MetaFunction, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { AlertTriangle, ExternalLink, ShieldOff, UserX, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProgrammeHealthSummary } from "@/features/admin/api/programme";
import type {
  ProgrammePulse,
  ProgrammeActivityDay,
  FlaggedChapter,
  TopChapter,
} from "@/features/admin/types/programme";

export const meta: MetaFunction = () => [
  { title: "Programme Health | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

// ─── Pulse Zone ────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return null;
  return (
    <span className="text-xs text-text-secondary ml-1">
      +{delta} this month
    </span>
  );
}

function PulseZone({ pulse }: { pulse: ProgrammePulse }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-feedback-success">{pulse.activeChapters}</div>
          <DeltaBadge delta={pulse.activeChaptersDelta} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Forming Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-feedback-warning">{pulse.formingChapters}</div>
          <DeltaBadge delta={pulse.formingChaptersDelta} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactive Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text-secondary">{pulse.inactiveChapters}</div>
          <DeltaBadge delta={pulse.inactiveChaptersDelta} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
          {pulse.staleApplications > 0 && (
            <AlertTriangle className="h-4 w-4 text-feedback-warning" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text-primary">{pulse.pendingApplications}</div>
          {pulse.staleApplications > 0 && (
            <p className="text-xs text-feedback-warning mt-1">
              {pulse.staleApplications} unreviewed for &gt;7 days
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Activity Zone ─────────────────────────────────────────────────────────

function computeRollingAverage(data: ProgrammeActivityDay[], windowSize = 7): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const slice = data.slice(start, i + 1);
    const sum = slice.reduce((acc, d) => acc + d.edits + d.photos, 0);
    return Math.round((sum / slice.length) * 10) / 10;
  });
}

function ActivityZone({ trend }: { trend: ProgrammeActivityDay[] }) {
  const rollingAvg = computeRollingAverage(trend);
  const chartData = trend.map((d, i) => ({
    ...d,
    date: d.date.slice(5), // MM-DD
    rollingAvg: rollingAvg[i],
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-text-secondary text-sm">
          No activity data in the last 30 days.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Contributions per day — last 30 days</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#525252" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#525252" }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 2, border: "1px solid #E5E5E5" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="edits"  name="Edits"  fill="#171717" maxBarSize={16} />
            <Bar dataKey="photos" name="Photos" fill="#A3A3A3" maxBarSize={16} />
            <Line
              type="monotone"
              dataKey="rollingAvg"
              name="7-day avg"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Flagged Chapters Zone ─────────────────────────────────────────────────

const FLAG_META: Record<string, { label: string; icon: React.ElementType; severity: "urgent" | "warning" }> = {
  no_president:       { label: "No president assigned", icon: ShieldOff, severity: "urgent"  },
  president_inactive: { label: "President inactive >30 days", icon: UserX,    severity: "warning" },
  forming_stalled:    { label: "Forming >60 days",            icon: Clock,     severity: "warning" },
};

function FlagRow({ flag }: { flag: FlaggedChapter }) {
  const meta = FLAG_META[flag.flagType] ?? FLAG_META.no_president;
  const Icon = meta.icon;
  const isUrgent = meta.severity === "urgent";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border-default last:border-b-0">
      <Icon className={`h-4 w-4 shrink-0 ${isUrgent ? "text-feedback-destructive" : "text-feedback-warning"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{flag.chapterName}</p>
        <p className="text-xs text-text-secondary">
          {meta.label}
          {flag.flagDetail && flag.flagType === "president_inactive" && ` — @${flag.flagDetail}`}
          {flag.flagDetail && flag.flagType === "forming_stalled"    && ` — ${flag.flagDetail} days`}
        </p>
      </div>
      <Badge
        className={`shrink-0 text-xs font-medium tracking-wide ${
          isUrgent
            ? "bg-feedback-destructive text-feedback-destructive-foreground"
            : "bg-feedback-warning text-feedback-warning-foreground"
        }`}
      >
        {isUrgent ? "Urgent" : "Warning"}
      </Badge>
      <Link
        to={`/admin/ambassadors/${flag.chapterId}`}
        className="shrink-0 text-text-secondary hover:text-text-primary"
        aria-label={`Manage ${flag.chapterName}`}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function FlaggedZone({ flags }: { flags: FlaggedChapter[] }) {
  if (flags.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-24 text-text-secondary text-sm">
          No chapters need attention right now.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Chapters needing attention
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-feedback-destructive text-feedback-destructive-foreground text-xs font-medium">
            {flags.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {flags.map((flag, i) => (
          <FlagRow key={`${flag.chapterId}-${flag.flagType}-${i}`} flag={flag} />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Top Chapters Zone ─────────────────────────────────────────────────────

function TopChaptersZone({ chapters }: { chapters: TopChapter[] }) {
  if (chapters.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-24 text-text-secondary text-sm">
          No chapter activity recorded this month.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top chapters this month</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left py-2 text-xs font-medium text-text-secondary tracking-wide uppercase">#</th>
              <th className="text-left py-2 text-xs font-medium text-text-secondary tracking-wide uppercase">Chapter</th>
              <th className="text-left py-2 text-xs font-medium text-text-secondary tracking-wide uppercase">Country</th>
              <th className="text-right py-2 text-xs font-medium text-text-secondary tracking-wide uppercase">Members</th>
              <th className="text-right py-2 text-xs font-medium text-text-secondary tracking-wide uppercase">Contributions</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((ch, i) => (
              <tr key={ch.chapterId} className="border-b border-border-default last:border-b-0 hover:bg-surface-muted">
                <td className="py-2.5 text-text-secondary font-mono text-xs">{i + 1}</td>
                <td className="py-2.5">
                  <Link
                    to={`/admin/ambassadors/${ch.chapterId}`}
                    className="text-text-primary hover:underline font-medium"
                  >
                    {ch.chapterName}
                  </Link>
                </td>
                <td className="py-2.5 text-text-secondary uppercase text-xs">{ch.countryCode}</td>
                <td className="py-2.5 text-right text-text-primary">{ch.memberCount}</td>
                <td className="py-2.5 text-right font-semibold text-text-primary">{ch.contributionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ProgrammeHealth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "programme-health"],
    queryFn: fetchProgrammeHealthSummary,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-feedback-destructive text-center max-w-lg">
          {error instanceof Error ? error.message : "Failed to load programme health data."}
        </p>
        <p className="text-sm text-text-secondary text-center max-w-md">
          Apply migration <code className="font-mono text-xs">20271120000000_programme_health_rpc.sql</code> in
          the Supabase SQL Editor, then reload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary">Programme Health</h1>

      {/* Pulse */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">Pulse</h2>
        <PulseZone pulse={data.pulse} />
      </section>

      {/* Activity */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">Contribution Activity</h2>
        <ActivityZone trend={data.activityTrend} />
      </section>

      {/* Flagged + Top side by side on large screens */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Needs Attention</h2>
          <FlaggedZone flags={data.flaggedChapters} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-text-primary">Top 5 This Month</h2>
          <TopChaptersZone chapters={data.topChapters} />
        </section>
      </div>
    </div>
  );
}
