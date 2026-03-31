import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
export function UserSearchNudge({ users, onSingleMatch, onMultipleMatch }) {
    if (users.length === 0)
        return null;
    const getAvatarUrl = (user) => {
        if (!user.avatar_url)
            return undefined;
        return user.avatar_url.startsWith("http")
            ? user.avatar_url
            : supabase.storage.from("avatars").getPublicUrl(user.avatar_url).data.publicUrl;
    };
    if (users.length === 1) {
        const user = users[0];
        return (_jsx("div", { className: "px-4 py-2 animate-in fade-in slide-in-from-top-2", children: _jsx(Card, { className: "bg-brand-secondary rounded-sm border border-border-default hover:bg-brand-secondary transition-colors cursor-pointer group", onClick: () => user.username && onSingleMatch(user.username), children: _jsxs(CardContent, { className: "flex items-center gap-3 p-4", children: [_jsxs(Avatar, { className: "h-8 w-8 border", children: [_jsx(AvatarImage, { src: getAvatarUrl(user) }), _jsx(AvatarFallback, { children: user.username?.charAt(0).toUpperCase() })] }), _jsx("div", { className: "flex-1", children: _jsxs("p", { className: "text-sm font-medium text-text-primary", children: ["Looking for", " ", _jsx("span", { className: "text-brand-primary font-semibold group-hover:underline", children: user.username }), "?"] }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-xs text-text-secondary group-hover:text-text-primary", children: "View Profile" })] }) }) }));
    }
    // Multiple matches
    return (_jsx("div", { className: "px-4 py-2 animate-in fade-in slide-in-from-top-2", children: _jsx(Card, { className: "bg-brand-secondary rounded-sm border border-border-default hover:bg-brand-secondary transition-colors cursor-pointer group", onClick: onMultipleMatch, children: _jsxs(CardContent, { className: "flex items-center gap-3 p-4", children: [_jsx("div", { className: "flex -space-x-2 overflow-hidden pl-1", children: users.slice(0, 3).map((user) => (_jsxs(Avatar, { className: "inline-block h-8 w-8 ring-2 ring-surface-default border", children: [_jsx(AvatarImage, { src: getAvatarUrl(user) }), _jsx(AvatarFallback, { children: user.username?.charAt(0).toUpperCase() })] }, user.id))) }), _jsx("div", { className: "flex-1", children: _jsxs("p", { className: "text-sm font-medium text-text-primary", children: [users.length, " people found matching your search"] }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-xs text-text-secondary group-hover:text-text-primary", children: "View All" })] }) }) }));
}
