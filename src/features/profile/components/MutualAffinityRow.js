import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
export function MutualAffinityRow({ users }) {
    if (!users || users.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: "w-full py-4 border-b border-border-default/40 bg-surface-card/30", children: [_jsx("div", { className: "px-4 mb-3", children: _jsx("h3", { className: "text-sm font-semibold text-text-secondary uppercase tracking-wider", children: "High Affinity with both of you" }) }), _jsxs(ScrollArea, { className: "w-full whitespace-nowrap", children: [_jsx("div", { className: "flex w-max space-x-4 px-4 pb-4", children: users.map((user) => (_jsxs(Link, { to: `/profile/${user.id}`, className: "group flex flex-col items-center gap-2 w-20", children: [_jsxs("div", { className: "relative", children: [_jsxs(Avatar, { className: "h-14 w-14 border-2 border-transparent group-hover:border-brand-primary/50 transition-colors", children: [_jsx(AvatarImage, { src: user.avatar_url || undefined, alt: user.username || "User" }), _jsx(AvatarFallback, { className: "bg-surface-muted text-text-secondary", children: user.username?.charAt(0).toUpperCase() || "?" })] }), _jsxs("div", { className: cn("absolute -bottom-2 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold h-6 w-8 border-2 border-surface-default shadow-sm", getScoreColor(user.combined_score)), children: [Math.round(user.combined_score * 100), "%"] })] }), _jsx("span", { className: "text-xs text-center truncate w-full text-text-secondary group-hover:text-text-primary transition-colors", children: user.username })] }, user.id))) }), _jsx(ScrollBar, { orientation: "horizontal" })] })] }));
}
function getScoreColor(score) {
    if (score >= 0.75)
        return "bg-brand-primary text-brand-primary-foreground border-border-default";
    if (score >= 0.5)
        return "bg-brand-secondary text-brand-secondary-foreground border-border-default";
    return "bg-surface-muted text-text-secondary border border-border-default";
}
