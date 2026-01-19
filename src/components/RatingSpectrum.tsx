import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RatingSpectrumProps {
  logs: {
    rating: number;
    user: {
      id: string;
      username: string | null;
      avatar_url: string | null;
    };
  }[];
}

// Helper to ensure avatar URLs are absolute
const getAvatarUrl = (path: string | null) => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
};

// Helper to get initials
const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface SpectrumColumnProps {
  score: number;
  logs: RatingSpectrumProps["logs"];
}

function SpectrumColumn({ score, logs }: SpectrumColumnProps) {
  const hasUsers = logs.length > 0;
  const count = logs.length;

  // Rule of 5:
  // - 1 to 5: Show all
  // - 6+: Show 4 avatars + 1 Badge (+N)
  // Max visible items in stack = 5.
  const MAX_STACK_VISIBLE = 5;
  const isOverflow = count > MAX_STACK_VISIBLE;
  const VISIBLE_AVATARS_COUNT = isOverflow ? 4 : count;

  // Visual Stack (Bottom to Top): Avatar 1, Avatar 2, ..., [Badge]
  // DOM Order for flex-col-reverse: [Badge], ..., Avatar 2, Avatar 1 (Top child is last visually? No, flex-col-reverse: last child in DOM is Top visually?
  // flex-col-reverse:
  // DOM: [A, B, C]
  // Visual (Top to Bottom): C, B, A.
  // We want Bottom to Top: Avatar 1, Avatar 2...
  // So DOM: [Avatar 1, Avatar 2...] with flex-col-reverse results in Visual Top: Avatar 1...
  // Wait.
  // flex-col: Top -> Bottom.
  // flex-col-reverse: Bottom -> Top.
  // So if we want visual Bottom -> Top: [Item 1 (Bottom), Item 2 (Above 1)...]
  // We should use flex-col-reverse and put Item 1 as first child? No.
  // flex-col-reverse renders items in reverse order of DOM.
  // DOM: [1, 2, 3] -> Visual: 3 (Top), 2, 1 (Bottom).
  // We want visual stack growing UPWARDS from the axis.
  // So Item 1 (first logged user) should be at the bottom.
  // So Item 1 should be LAST in visual order if looking top-down.
  // With flex-col-reverse:
  // DOM First Child -> Visual Bottom.
  // DOM Last Child -> Visual Top.
  // Correct.
  // So DOM order: [Avatar 1 (Bottom), Avatar 2, ..., Badge (Top)]

  const visualItems: React.ReactNode[] = [];

  // Sort logs alphabetically by username to have consistent order?
  // Or by date? We don't have date here easily. Alphabetical is fine.
  const sortedLogs = [...logs].sort((a, b) =>
    (a.user.username || "").localeCompare(b.user.username || "")
  );

  const visibleLogs = sortedLogs.slice(0, VISIBLE_AVATARS_COUNT);
  const hiddenCount = count - VISIBLE_AVATARS_COUNT;

  // Add avatars (Bottom ones first in DOM)
  visibleLogs.forEach(log => {
    visualItems.push(
      <SpectrumAvatar key={log.user.id} log={log} />
    );
  });

  // Add Badge if overflow (Top-most element in DOM for flex-col-reverse)
  if (isOverflow) {
    visualItems.push(
      <HoverCard key="overflow" openDelay={0} closeDelay={0}>
        <HoverCardTrigger asChild>
           <div className="w-10 h-10 rounded-full border-2 border-background bg-slate-800 text-white flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer z-10 hover:bg-slate-700 transition-colors">
            +{hiddenCount}
          </div>
        </HoverCardTrigger>
        <UserListContent score={score} logs={logs} />
      </HoverCard>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-end h-full pb-3 group/column min-h-[60px]">
      {/* Axis Tick */}
      {/* <div className="absolute bottom-0 h-1 w-px bg-border/50" /> */}
      {/* Removing tick to make it cleaner, or keep it? Brief says "First avatar... immediately above... score number".
          Let's keep the score label as the anchor. */}

      {/* Score Label */}
      <span className={cn(
        "absolute -bottom-5 text-sm font-bold transition-colors",
        hasUsers ? "text-foreground" : "text-muted-foreground/30"
      )}>
        {score}
      </span>

      {/* Stack Container */}
      {/* gap-[2px] for "small, consistent gutter" */}
      {/* flex-col-reverse: First child is at Bottom. */}
      {/* pb-1 to put first avatar immediately above number (which is absolute -bottom-5).
          Container justifies end. So bottom of content aligns with bottom of container.
          The label is absolute -bottom-5.
          So 0 padding -> items sit on the bottom edge.
          Brief: "immediately above". 0 padding is fine or 1px.
      */}
      <div className="flex flex-col-reverse items-center gap-[2px] transition-all duration-200 w-full px-0.5">
          {visualItems}
      </div>
    </div>
  );
}

function SpectrumAvatar({ log }: { log: RatingSpectrumProps["logs"][0] }) {
  const username = log.user.username || "User";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="relative group/avatar cursor-default">
             <Avatar className="w-10 h-10 shadow-sm transition-transform hover:z-20">
              <AvatarImage src={getAvatarUrl(log.user.avatar_url)} />
              <AvatarFallback className="bg-blue-900 text-primary font-medium text-xs">
                {getInitials(username)}
              </AvatarFallback>
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-bold">
          {username}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UserListContent({ score, logs }: { score: number, logs: RatingSpectrumProps["logs"] }) {
  return (
    <HoverCardContent side="top" className="w-64 p-3 shadow-lg border-border/60 z-50">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/50">
        <span className="font-bold text-sm">Rated {score}/10</span>
        <span className="text-xs text-muted-foreground">{logs.length} people</span>
      </div>
      <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
        {logs.map(l => (
          <div key={l.user.id} className="flex items-center gap-2 text-sm group/user">
            <Avatar className="w-8 h-8 border border-border/50">
              <AvatarImage src={getAvatarUrl(l.user.avatar_url)} />
              <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                {getInitials(l.user.username || "?")}
              </AvatarFallback>
            </Avatar>
            <span className="truncate flex-1 text-foreground/80 group-hover/user:text-foreground transition-colors">
              {l.user.username || "User"}
            </span>
          </div>
        ))}
      </div>
    </HoverCardContent>
  );
}

export function RatingSpectrum({ logs }: RatingSpectrumProps) {
  const buckets = useMemo(() => {
    const b: Record<number, typeof logs> = {};
    for (let i = 1; i <= 10; i++) b[i] = [];
    logs.forEach((log) => {
      const r = Math.round(log.rating);
      if (b[r]) b[r].push(log);
    });
    return b;
  }, [logs]);

  const totalRatings = logs.length;

  if (totalRatings === 0) {
    return (
      <div className="text-xs text-muted-foreground italic pl-1 mt-2">
        No group ratings yet.
      </div>
    );
  }

  return (
    <div className="w-full select-none">
      {/* Removed fixed height h-32. Using min-h to ensure axis is visible even if empty?
          Actually empty buckets have 0 items.
          The grid needs some height? No, if items are there they take height.
          We need to ensure the "absolute" labels have space.
          The parent likely needs pb-6 or so.
      */}
      <div className="relative w-full flex items-end pb-6">
        {/* pb-8 to accommodate the absolute bottom labels (-bottom-5) */}

        {/* Axis Line */}
        <div className="absolute bottom-6 left-0 right-0 h-px bg-border/50 w-full" />

        {/* Columns Grid */}
        <div className="w-full grid grid-cols-10 h-auto items-end">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
             <SpectrumColumn
               key={score}
               score={score}
               logs={buckets[score]}
             />
          ))}
        </div>
      </div>
    </div>
  );
}
