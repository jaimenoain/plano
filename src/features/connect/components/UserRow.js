import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router";
import { Star, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { supabase } from "@/integrations/supabase/client";
import { MutualFacepile } from "./MutualFacepile";
export function UserRow({ user, showFollowButton = false, isFollower = false, isCloseFriend, onToggleCloseFriend, onHide, mutualFollows }) {
    const navigate = useNavigate();
    const avatarUrl = user.avatar_url
        ? (user.avatar_url.startsWith("http")
            ? user.avatar_url
            : supabase.storage.from("avatars").getPublicUrl(user.avatar_url).data.publicUrl)
        : undefined;
    return (_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border-default hover:bg-brand-secondary transition-colors cursor-pointer relative group", onClick: () => navigate(`/profile/${user.username?.toLowerCase() || user.id}`), children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0 flex-1", children: [_jsxs(Avatar, { children: [_jsx(AvatarImage, { src: avatarUrl }), _jsx(AvatarFallback, { children: user.username?.charAt(0).toUpperCase() || "?" })] }), _jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "font-medium text-sm truncate", children: user.username || "Unknown User" }), mutualFollows && _jsx(MutualFacepile, { users: mutualFollows })] })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0 ml-2", onClick: (e) => e.stopPropagation(), children: [onHide && (_jsx("button", { onClick: onHide, className: "p-1.5 hover:bg-surface-muted rounded-sm transition-colors focus:outline-none text-text-secondary hover:text-text-primary", title: "Hide suggestion", children: _jsx(X, { className: "h-4 w-4" }) })), onToggleCloseFriend && (_jsx("button", { onClick: onToggleCloseFriend, className: "p-1 hover:bg-surface-muted rounded-sm transition-colors focus:outline-none", title: isCloseFriend ? "Remove from close friends" : "Add to close friends", children: _jsx(Star, { className: `h-5 w-5 ${isCloseFriend ? "fill-feedback-warning text-feedback-warning" : "text-text-secondary"}` }) })), showFollowButton && (_jsx("div", { children: _jsx(FollowButton, { userId: user.id, isFollower: isFollower, className: "h-8 text-xs px-3" }) }))] })] }));
}
