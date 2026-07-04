import { Badge } from "@/components/ui/badge";
import { Trophy, Gem, Sparkles } from "lucide-react";
import type { ReactElement } from "react";

interface PopularityBadgeProps {
  rank: string | null | undefined;
  city: string | null | undefined;
}

export function PopularityBadge({ rank, city }: PopularityBadgeProps) {
  if (!rank || (rank !== "Top 1%" && rank !== "Top 5%" && rank !== "Top 10%")) {
    return null;
  }

  let badgeClass = "rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide";
  let icon: ReactElement | null = null;

  if (rank === "Top 1%") {
    badgeClass += " bg-brand-primary text-brand-primary-foreground";
    icon = <Trophy className="w-3 h-3 mr-1" />;
  } else if (rank === "Top 5%") {
    badgeClass += " bg-brand-secondary text-brand-secondary-foreground";
    icon = <Gem className="w-3 h-3 mr-1" />;
  } else if (rank === "Top 10%") {
    badgeClass += " bg-surface-muted text-text-secondary border border-border-default";
    icon = <Sparkles className="w-3 h-3 mr-1" />;
  }

  const text = city ? `${rank} in ${city}` : rank;

  return (
    <Badge variant="outline" className={`font-medium px-2 py-0.5 whitespace-normal sm:whitespace-nowrap text-left ${badgeClass}`}>
      {icon}
      {text}
    </Badge>
  );
}
