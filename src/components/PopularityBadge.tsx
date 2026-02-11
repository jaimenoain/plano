import { Badge } from "@/components/ui/badge";
import { Trophy, Gem, Sparkles } from "lucide-react";

interface PopularityBadgeProps {
  rank: string | null | undefined;
  city: string | null | undefined;
}

export function PopularityBadge({ rank, city }: PopularityBadgeProps) {
  if (!rank || (rank !== "Top 1%" && rank !== "Top 5%" && rank !== "Top 10%")) {
    return null;
  }

  let badgeClass = "";
  let icon = null;

  if (rank === "Top 1%") {
    badgeClass = "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100/90";
    icon = <Trophy className="w-3 h-3 mr-1 fill-amber-500 text-amber-600" />;
  } else if (rank === "Top 5%") {
    badgeClass = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100/90";
    icon = <Gem className="w-3 h-3 mr-1 fill-slate-400 text-slate-500" />;
  } else if (rank === "Top 10%") {
    badgeClass = "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-50/90";
    icon = <Sparkles className="w-3 h-3 mr-1 fill-orange-300 text-orange-400" />;
  }

  const text = city ? `${rank} in ${city}` : rank;

  return (
    <Badge variant="outline" className={`font-medium px-2 py-0.5 whitespace-nowrap ${badgeClass}`}>
      {icon}
      {text}
    </Badge>
  );
}
