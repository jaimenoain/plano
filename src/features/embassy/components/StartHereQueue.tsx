import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchStartHereTasks,
  type StartHereTask,
  type StartHereToolKey,
} from "@/features/embassy/api/startHere";

// Same icons the Contribute tool cards use, so a task reads as its tool at a glance.
const TOOL_ICON: Record<StartHereToolKey, LucideIcon> = {
  research: Search,
  curation: Filter,
  photography: Camera,
  outreach: CheckCircle2,
  events: CalendarClock,
};

function StartHereRow({ task }: { task: StartHereTask }) {
  const Icon = TOOL_ICON[task.toolKey];
  const behind = task.backlogCount - 1; // items still waiting behind this one
  return (
    <Link
      to={task.href}
      className="flex items-center gap-3 rounded-sm border border-border-default p-3 transition-colors hover:bg-surface-muted/50"
    >
      <span className="shrink-0 text-text-secondary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{task.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.context}</p>
      </div>
      {behind > 0 && (
        <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">+{behind} more</span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}

/**
 * "Start here" queue — the top-of-dashboard task feed. Aggregates the top live
 * item of each contribution queue into 3–5 ready tasks ranked by the saved tool
 * preference + chapter backlog (see `fetchStartHereTasks`), each deep-linking
 * into the tool with that item at the top.
 */
export function StartHereQueue({
  chapterId,
  preferredTools,
}: {
  chapterId?: string;
  preferredTools: string[] | null | undefined;
}) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["embassy-start-here", chapterId],
    queryFn: () => fetchStartHereTasks(chapterId!, preferredTools),
    enabled: !!chapterId,
    staleTime: 30_000,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-text-secondary" aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">Start here</h2>
        {!isLoading && tasks && tasks.length > 0 && (
          <Badge
            variant="secondary"
            className="rounded-full px-2 py-0 text-2xs font-normal tabular-nums"
          >
            {tasks.length}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-sm" />
          ))}
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          You&apos;re all caught up — no ready tasks in your chapter right now.{" "}
          <Link to="/embassy/contribute" className="underline underline-offset-2">
            Browse the tools
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <StartHereRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </section>
  );
}
