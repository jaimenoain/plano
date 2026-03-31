import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
export function FeedClusterCard({ entries, user, location: _location, timestamp }) {
    const navigate = useNavigate();
    const handleClick = (e) => {
        // Avoid triggering if clicking an interactive element (though none exist here yet)
        const target = e.target;
        if (target.closest('button'))
            return;
        if (user.username) {
            navigate(`/profile/${user.username}`);
        }
    };
    const username = user.username || "Unknown User";
    const userInitial = username.charAt(0).toUpperCase();
    const avatarUrl = user.avatar_url || undefined;
    return (_jsx("div", { onClick: handleClick, className: "w-full max-w-full min-w-0 cursor-pointer bg-surface-card border border-border-default rounded-sm shadow-none hover:border-border-strong transition-colors", children: _jsxs("div", { className: "flex items-start gap-3 p-4", children: [_jsxs(Avatar, { className: "h-6 w-6 border border-border-default/50 shrink-0 mt-0.5", children: [_jsx(AvatarImage, { src: avatarUrl }), _jsx(AvatarFallback, { className: "text-[10px]", children: userInitial })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-baseline justify-between gap-2", children: _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm text-text-primary font-semibold truncate", children: username }), _jsxs("div", { className: "text-xs text-text-secondary", children: [formatDistanceToNow(new Date(timestamp)).replace("about ", ""), " ago"] })] }) }), _jsx("div", { className: "mt-3 space-y-1.5 text-sm text-text-secondary", children: entries.map((entry) => (_jsxs("div", { className: "flex items-start gap-1.5", children: [_jsx("span", { className: "mt-[2px] text-xs text-text-secondary", children: "\u2022" }), _jsxs("span", { className: "min-w-0", children: [_jsxs("span", { className: "text-text-secondary", children: [entry.status === "pending" ? "pending" : "visited", " "] }), _jsx("span", { className: "font-semibold text-text-primary", children: entry.building.name })] })] }, entry.id))) })] })] }) }));
}
