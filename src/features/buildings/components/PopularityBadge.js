import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "@/components/ui/badge";
import { Trophy, Gem, Sparkles } from "lucide-react";
export function PopularityBadge({ rank, city }) {
    if (!rank || (rank !== "Top 1%" && rank !== "Top 5%" && rank !== "Top 10%")) {
        return null;
    }
    let badgeClass = "rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide";
    let icon = null;
    if (rank === "Top 1%") {
        badgeClass += " bg-brand-primary text-brand-primary-foreground";
        icon = _jsx(Trophy, { className: "w-3 h-3 mr-1" });
    }
    else if (rank === "Top 5%") {
        badgeClass += " bg-brand-secondary text-brand-secondary-foreground";
        icon = _jsx(Gem, { className: "w-3 h-3 mr-1" });
    }
    else if (rank === "Top 10%") {
        badgeClass += " bg-surface-muted text-text-secondary border border-border-default";
        icon = _jsx(Sparkles, { className: "w-3 h-3 mr-1" });
    }
    const text = city ? `${rank} in ${city}` : rank;
    return (_jsxs(Badge, { variant: "outline", className: `font-medium px-2 py-0.5 whitespace-normal sm:whitespace-nowrap text-left ${badgeClass}`, children: [icon, text] }));
}
