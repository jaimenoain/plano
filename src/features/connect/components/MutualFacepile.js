import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
export function MutualFacepile({ users, className }) {
    if (!users || users.length === 0)
        return null;
    const maxAvatars = 3;
    const displayUsers = users.slice(0, maxAvatars);
    // Text Logic
    const names = users.map(u => u.username || "Unknown").filter(Boolean);
    let text = "";
    if (users.length === 1) {
        text = `followed by ${names[0]}`;
    }
    else if (users.length === 2) {
        text = `${names[0]}, ${names[1]}`;
    }
    else {
        const othersCount = users.length - 2;
        text = `${names[0]}, ${names[1]} +${othersCount}`;
    }
    return (_jsxs("div", { className: `flex items-center gap-2 mt-1 ${className || ""}`, children: [_jsx("div", { className: "flex -space-x-2", children: displayUsers.map((user) => {
                    const avatarUrl = user.avatar_url
                        ? (user.avatar_url.startsWith("http")
                            ? user.avatar_url
                            : supabase.storage.from("avatars").getPublicUrl(user.avatar_url).data.publicUrl)
                        : undefined;
                    return (_jsxs(Avatar, { className: "h-5 w-5 border-2 border-surface-default", children: [_jsx(AvatarImage, { src: avatarUrl || "", alt: user.username || "User" }), _jsx(AvatarFallback, { className: "text-[8px]", children: (user.username?.[0] || "?").toUpperCase() })] }, user.id));
                }) }), _jsx("span", { className: "text-xs text-text-secondary truncate flex-1 min-w-0", children: text })] }));
}
