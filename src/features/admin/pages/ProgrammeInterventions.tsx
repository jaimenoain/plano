import { type MetaFunction, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, XCircle, Info, ChevronDown, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchInterventionFlags, dismissInterventionFlag } from "@/features/admin/api/programme";
import type { InterventionFlag, InterventionSeverity } from "@/features/admin/types/programme";
import {
  AdminPageHeader,
  AdminSectionLabel,
  AdminEmptyState,
  AdminErrorState,
} from "@/features/admin/components/admin-ui";

export const meta: MetaFunction = () => [
  { title: "Intervention Queue | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<InterventionSeverity, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  borderClass: string;
  headingClass: string;
}> = {
  urgent: {
    label: "Urgent",
    icon: XCircle,
    badgeClass: "bg-feedback-destructive text-feedback-destructive-foreground",
    borderClass: "border-l-4 border-l-feedback-destructive",
    headingClass: "text-feedback-destructive",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    badgeClass: "bg-feedback-warning text-feedback-warning-foreground",
    borderClass: "border-l-4 border-l-feedback-warning",
    headingClass: "text-feedback-warning",
  },
  info: {
    label: "Info",
    icon: Info,
    badgeClass: "bg-surface-muted text-text-secondary",
    borderClass: "border-l-4 border-l-border-default",
    headingClass: "text-text-secondary",
  },
};

const SEVERITY_ORDER: InterventionSeverity[] = ["urgent", "warning", "info"];

// ─── Flag card ────────────────────────────────────────────────────────────────

function FlagCard({
  flag,
  onDismiss,
  onSnooze,
  isPending,
}: {
  flag: InterventionFlag;
  onDismiss: () => void;
  onSnooze: (days: number) => void;
  isPending: boolean;
}) {
  const config = SEVERITY_CONFIG[flag.severity];
  const Icon = config.icon;

  return (
    <Card className={`${config.borderClass} overflow-hidden`}>
      <CardContent className="p-4 flex items-start gap-4">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.headingClass}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-xs font-medium ${config.badgeClass}`}>
              {config.label}
            </Badge>
            <Link
              to={`/admin/ambassadors/${flag.chapterId}`}
              className="text-sm font-semibold text-text-primary hover:underline flex items-center gap-1"
            >
              {flag.chapterName}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Link>
            <span className="text-xs text-text-secondary uppercase tracking-wide">
              {flag.countryCode}
            </span>
          </div>
          <p className="text-sm text-text-primary">{flag.description}</p>
          <p className="text-xs text-text-secondary mt-1">
            Suggested: {flag.suggestedAction}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1"
              disabled={isPending}
            >
              Dismiss
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDismiss}>
              Dismiss permanently
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSnooze(7)}>
              Snooze 7 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSnooze(14)}>
              Snooze 14 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSnooze(30)}>
              Snooze 30 days
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

// ─── Severity section ─────────────────────────────────────────────────────────

function SeveritySection({
  severity,
  flags,
  pendingKey,
  onDismiss,
  onSnooze,
}: {
  severity: InterventionSeverity;
  flags: InterventionFlag[];
  pendingKey: string | null;
  onDismiss: (flag: InterventionFlag) => void;
  onSnooze: (flag: InterventionFlag, days: number) => void;
}) {
  const config = SEVERITY_CONFIG[severity];
  if (flags.length === 0) return null;

  return (
    <section>
      <AdminSectionLabel className={config.headingClass}>
        {config.label} · {flags.length}
      </AdminSectionLabel>
      <div className="space-y-2 mt-3">
        {flags.map((flag) => (
          <FlagCard
            key={`${flag.flagType}-${flag.chapterId}`}
            flag={flag}
            isPending={pendingKey === `${flag.flagType}-${flag.chapterId}`}
            onDismiss={() => onDismiss(flag)}
            onSnooze={(days) => onSnooze(flag, days)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 rounded-sm" />
        <Skeleton className="h-9 w-64 rounded-sm" />
      </div>
      <Skeleton className="h-4 w-72" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgrammeInterventions() {
  const queryClient = useQueryClient();

  const { data: flags = [], isLoading, error } = useQuery({
    queryKey: ["admin", "intervention-flags"],
    queryFn: fetchInterventionFlags,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: dismiss, variables: dismissVars, isPending } = useMutation({
    mutationFn: ({ flag, snoozeDays }: { flag: InterventionFlag; snoozeDays?: number }) =>
      dismissInterventionFlag(flag.flagType, flag.chapterId, snoozeDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "intervention-flags"] });
    },
  });

  const pendingKey = isPending && dismissVars
    ? `${dismissVars.flag.flagType}-${dismissVars.flag.chapterId}`
    : null;

  const handleDismiss = (flag: InterventionFlag) => dismiss({ flag });
  const handleSnooze = (flag: InterventionFlag, days: number) => dismiss({ flag, snoozeDays: days });

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Programme"
          title="Intervention Queue"
          description="Automated flags that need attention. Dismissals are per-user."
        />
        <AdminErrorState
          message={
            error instanceof Error
              ? error.message
              : "Failed to load intervention flags. Apply migration 20271123000000_intervention_queue.sql in the Supabase SQL Editor, then reload."
          }
        />
      </div>
    );
  }

  const byseverity = SEVERITY_ORDER.reduce<Record<InterventionSeverity, InterventionFlag[]>>(
    (acc, s) => {
      acc[s] = flags.filter((f) => f.severity === s);
      return acc;
    },
    { urgent: [], warning: [], info: [] },
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Programme"
        title="Intervention Queue"
        description="Automated flags that need attention. Dismissals are per-user — your teammates still see flags you dismiss."
      />

      {flags.length === 0 ? (
        <AdminEmptyState
          title="No active flags"
          description="The programme is healthy. Check back later if you expected flags to appear."
        />
      ) : (
        <div className="space-y-8">
          {SEVERITY_ORDER.map((severity) => (
            <SeveritySection
              key={severity}
              severity={severity}
              flags={byseverity[severity]}
              pendingKey={pendingKey}
              onDismiss={handleDismiss}
              onSnooze={handleSnooze}
            />
          ))}
        </div>
      )}
    </div>
  );
}
