import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, MoreHorizontal, Ban } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { BlockUserDialog } from "./BlockUserDialog";
import { AddBuildingDialog } from "./AddBuildingDialog";
export function UserCard({ profile, stats, isOwnProfile, isFollowing, onFollowToggle, onSignOut, onOpenUserList, onTabChange, onBuildingAdded, squad: _squad = [] }) {
    const navigate = useNavigate();
    const [showBlockDialog, setShowBlockDialog] = useState(false);
    const totalBuildings = stats.reviews + stats.pending;
    return (_jsx("div", { className: "px-4 py-6 md:py-10 max-w-6xl mx-auto pb-8 border-b border-border-default", children: _jsxs("div", { className: "flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center", children: [_jsx("div", { className: "shrink-0 mx-auto md:mx-0", children: _jsxs(Avatar, { className: "h-20 w-20 md:h-24 md:w-24 rounded-full border-2 border-border-default shadow-none", children: [_jsx(AvatarImage, { src: profile?.avatar_url || undefined, className: "object-cover" }), _jsx(AvatarFallback, { className: "text-3xl bg-surface-muted", children: profile?.username?.charAt(0).toUpperCase() })] }) }), _jsxs("div", { className: "flex-1 min-w-0 w-full", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 md:mb-6", children: [_jsx("h1", { className: "text-3xl font-semibold tracking-tight text-text-primary truncate min-w-0 max-w-[200px] md:max-w-none", children: profile?.username }), _jsx("div", { className: "flex items-center gap-2 md:ml-6", children: isOwnProfile ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: () => navigate("/settings"), className: "h-8", children: "Edit profile" }), _jsx(AddBuildingDialog, { onBuildingAdded: onBuildingAdded }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) }) }), _jsx(DropdownMenuContent, { align: "end", children: _jsxs(DropdownMenuItem, { onClick: onSignOut, className: "text-feedback-destructive", children: [_jsx(LogOut, { className: "mr-2 h-4 w-4" }), " Sign Out"] }) })] })] })) : (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: onFollowToggle, variant: isFollowing ? "outline" : "default", size: "sm", className: "h-8 px-5 font-semibold", children: isFollowing ? "Following" : "Follow" }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) }) }), _jsx(DropdownMenuContent, { align: "end", children: _jsxs(DropdownMenuItem, { onClick: () => setShowBlockDialog(true), className: "text-feedback-destructive", children: [_jsx(Ban, { className: "mr-2 h-4 w-4" }), " Block User"] }) })] })] })) })] }), profile && !isOwnProfile && (_jsx(BlockUserDialog, { open: showBlockDialog, onOpenChange: setShowBlockDialog, userId: profile.id, username: profile.username || "this user" })), _jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-6 mb-5 px-2 md:px-0", children: [_jsx(StatItem, { label: "edificios", value: totalBuildings, onClick: () => onTabChange("all") }), _jsx(StatItem, { label: "photos", value: stats.photos, onClick: () => {
                                        if (isOwnProfile) {
                                            navigate("/profile/photos");
                                        }
                                        else if (profile?.username) {
                                            navigate(`/profile/${profile.username}/photos`);
                                        }
                                        else if (profile?.id) {
                                            navigate(`/profile/${profile.id}/photos`);
                                        }
                                    } }), _jsx(StatItem, { label: "maps", value: stats.maps, onClick: () => document.getElementById('collections-section')?.scrollIntoView({ behavior: 'smooth' }) }), _jsx(StatItem, { label: "followers", value: stats.followers, onClick: () => onOpenUserList("followers") }), _jsx(StatItem, { label: "following", value: stats.following, onClick: () => onOpenUserList("following") })] }), _jsxs("div", { className: "text-center md:text-left px-2 md:px-0", children: [profile?.bio && (_jsx("p", { className: "text-base leading-relaxed whitespace-pre-wrap mb-2 text-text-secondary max-w-lg", children: profile.bio })), profile?.last_online && (_jsxs("p", { className: "text-[10px] text-text-secondary font-medium inline-flex items-center gap-1.5", children: [_jsx("span", { className: cn("w-1.5 h-1.5 rounded-full", new Date(profile.last_online).getTime() > Date.now() - 1000 * 60 * 10 ? "bg-feedback-success" : "bg-text-secondary/30") }), new Date(profile.last_online).getTime() > Date.now() - 1000 * 60 * 10
                                            ? "Online"
                                            : `Seen ${formatDistanceToNow(new Date(profile.last_online), { addSuffix: true })}`] }))] })] })] }) }));
}
function StatItem({ label, value, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: "flex flex-col md:flex-row items-center gap-1 group", children: [_jsx("span", { className: "text-xl font-semibold text-text-primary group-hover:text-brand-primary transition-colors", children: formatStatValue(value) }), _jsx("span", { className: "text-xs text-text-secondary capitalize", children: label })] }));
}
function formatStatValue(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return value.toString();
}
