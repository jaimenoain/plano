import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarRail, useSidebar, } from "@/components/ui/sidebar";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { Activity, Users, User as UserIcon, Play, Search, ChevronsUpDown, Settings, LogOut, Bell, } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
const navItems = [
    { icon: Activity, label: "Feed", path: "/" },
    { icon: Play, label: "Explore", path: "/explore" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: Users, label: "Connect", path: "/connect" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: UserIcon, label: "You", path: "/profile" },
];
function UserMenu() {
    const { user, signOut } = useAuth();
    const { profile } = useUserProfile();
    const { isMobile } = useSidebar();
    const navigate = useNavigate();
    const handleSignOut = async () => {
        await signOut();
        navigate("/");
    };
    if (!user)
        return null;
    return (_jsx(SidebarMenu, { children: _jsx(SidebarMenuItem, { children: _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs("button", { className: "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-card transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2", children: [_jsxs(Avatar, { className: "h-7 w-7 flex-shrink-0", children: [_jsx(AvatarImage, { src: profile?.avatar_url || "", alt: profile?.username || user?.email || "" }), _jsx(AvatarFallback, { className: "text-xs", children: (profile?.username || user?.email || "U").charAt(0).toUpperCase() })] }), _jsxs("div", { className: "grid flex-1 text-left leading-tight min-w-0", children: [_jsx("span", { className: "truncate font-semibold text-sm", children: profile?.username || "User" }), _jsx("span", { className: "truncate text-xs text-text-secondary", children: user?.email || "" })] }), _jsx(ChevronsUpDown, { className: "ml-auto h-4 w-4 flex-shrink-0 text-text-secondary" })] }) }), _jsxs(DropdownMenuContent, { className: "w-56", side: isMobile ? "bottom" : "right", align: "end", sideOffset: 4, children: [_jsx(DropdownMenuItem, { asChild: true, children: _jsxs(Link, { to: "/profile", className: "flex items-center gap-2 cursor-pointer", children: [_jsx(UserIcon, { className: "h-4 w-4" }), "Your profile"] }) }), _jsx(DropdownMenuItem, { asChild: true, children: _jsxs(Link, { to: "/settings", className: "flex items-center gap-2 cursor-pointer", children: [_jsx(Settings, { className: "h-4 w-4" }), "Edit profile"] }) }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { onClick: handleSignOut, className: "gap-2 cursor-pointer text-feedback-destructive focus:text-feedback-destructive", children: [_jsx(LogOut, { className: "h-4 w-4" }), "Sign out"] })] })] }) }) }));
}
export function AppSidebar() {
    const location = useLocation();
    return (_jsxs(Sidebar, { collapsible: "offcanvas", className: "border-r border-sidebar-border bg-sidebar", children: [_jsx(SidebarHeader, { className: "!p-6", children: _jsx(Link, { to: "/", className: "inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-sm", children: _jsx(PlanoLogo, { className: "h-8 w-auto" }) }) }), _jsx(SidebarContent, { children: _jsx(SidebarGroup, { className: "!p-0", children: _jsx(SidebarGroupContent, { children: _jsx(SidebarMenu, { className: "px-3 py-4", children: navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (_jsx(SidebarMenuItem, { children: _jsxs(Link, { to: item.path, className: cn("flex items-center gap-3 px-3 py-2 rounded-sm w-full text-sm font-medium text-text-primary transition-colors duration-150", isActive
                                            ? "bg-surface-card border border-border-default border-l-2 border-brand-primary font-semibold"
                                            : "bg-transparent hover:bg-surface-card"), children: [_jsx(item.icon, { className: "h-5 w-5 flex-shrink-0", strokeWidth: isActive ? 2.5 : 2 }), _jsx("span", { children: item.label })] }) }, item.path));
                            }) }) }) }) }), _jsx(SidebarFooter, { className: "!p-4 border-t border-sidebar-border", children: _jsx(UserMenu, {}) }), _jsx(SidebarRail, {})] }));
}
