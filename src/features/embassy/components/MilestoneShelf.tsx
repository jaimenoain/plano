import { formatDistanceToNow } from "date-fns";
import { Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMilestones } from "../hooks/useMilestones";
import { sortMilestones, type Milestone } from "../api/milestones";

/**
 * The four milestones an ambassador can earn (roadmap 3.3), shown on /embassy/impact.
 *
 * Renders nothing while loading or on failure: this is recognition, not information —
 * a skeleton or an error panel here would be louder than the thing it stands in for,
 * and the page's own totals and timeline still tell the whole story without it.
 */
export function MilestoneShelf() {
  const { data } = useMilestones();

  if (!data || data.length === 0) return null;

  const milestones = sortMilestones(data);
  const earnedCount = milestones.filter((m) => m.earnedAt).length;

  return (
    <section className="space-y-4" aria-labelledby="my-impact-milestones-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="my-impact-milestones-heading" className="text-lg font-semibold text-text-primary">
          Milestones
        </h2>
        <p className="text-2xs uppercase tracking-widest text-text-disabled tabular-nums">
          {earnedCount} of {milestones.length} earned
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {milestones.map((milestone) => (
          <MilestoneCard key={milestone.key} milestone={milestone} />
        ))}
      </div>
    </section>
  );
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const earned = !!milestone.earnedAt;
  // Progress keeps counting past the target (and a lapsed streak counts down), so clamp
  // before it reaches the bar.
  const ratio = Math.min(1, Math.max(0, milestone.progress / milestone.target));

  return (
    <Card className="border border-border-default rounded-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Award
          className={cn("h-5 w-5 shrink-0", earned ? "text-feedback-warning" : "text-text-disabled")}
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "text-sm font-medium",
              earned ? "text-text-primary" : "text-text-secondary",
            )}
          >
            {milestone.label}
          </p>
          <p className="text-2xs text-text-disabled">{milestone.description}</p>
        </div>
      </div>

      {earned ? (
        <p className="text-2xs uppercase tracking-widest text-text-disabled">
          Earned {formatDistanceToNow(new Date(milestone.earnedAt as string), { addSuffix: true })}
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="h-1 w-full rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-text-primary"
              style={{ width: `${ratio * 100}%` }}
              aria-hidden
            />
          </div>
          <p className="text-2xs text-text-disabled tabular-nums">
            {Math.min(milestone.progress, milestone.target)} / {milestone.target}
          </p>
        </div>
      )}
    </Card>
  );
}
