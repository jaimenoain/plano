import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";
export function ContactFacepile({ interactions, className }) {
    const uniqueUsers = useMemo(() => {
        const seen = new Set();
        const users = [];
        interactions.forEach(interaction => {
            if (!seen.has(interaction.user.id)) {
                seen.add(interaction.user.id);
                users.push(interaction.user);
            }
        });
        return users;
    }, [interactions]);
    if (uniqueUsers.length === 0)
        return null;
    const maxAvatars = 3;
    const displayUsers = uniqueUsers.slice(0, maxAvatars);
    // Text Logic
    const names = uniqueUsers.map(u => u.first_name || u.username || "Unknown").filter(Boolean);
    let text = "";
    if (uniqueUsers.length === 1) {
        text = `${names[0]}`;
    }
    else if (uniqueUsers.length === 2) {
        text = `${names[0]}, ${names[1]}`;
    }
    else {
        const othersCount = uniqueUsers.length - 2;
        text = `${names[0]}, ${names[1]} +${othersCount}`;
    }
    return (_jsxs("div", { className: `flex items-center gap-2 mb-2 min-w-0 ${className || ""}`, children: [_jsx("div", { className: "flex -space-x-2 shrink-0", children: displayUsers.map((user) => (_jsxs(Avatar, { className: "h-6 w-6 rounded-full border-2 border-surface-card", children: [_jsx(AvatarImage, { src: user.avatar_url || "", alt: user.username || "User" }), _jsx(AvatarFallback, { className: "bg-surface-muted text-[10px] text-text-secondary", children: (user.first_name?.[0] || user.username?.[0] || "?").toUpperCase() })] }, user.id))) }), _jsx("span", { className: "text-xs text-text-secondary font-medium truncate", children: text })] }));
}
