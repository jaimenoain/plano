import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LayoutDashboard, Building2, Users, Settings, LogOut, Merge, ShieldAlert, Image, Map, History, Trash2, FileCheck, } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, } from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
const items = [
    {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
    },
    {
        title: "Buildings",
        url: "/admin/buildings",
        icon: Building2,
    },
    {
        title: "Merge Duplicates",
        url: "/admin/merge",
        icon: Merge,
    },
    {
        title: "Users",
        url: "/admin/users",
        icon: Users,
    },
    {
        title: "Pending Claims",
        url: "/admin/claims",
        icon: FileCheck,
    },
    {
        title: "Moderation",
        url: "/admin/moderation",
        icon: ShieldAlert,
    },
    {
        title: "Image Wall",
        url: "/admin/images",
        icon: Image,
    },
    {
        title: "Photo Analytics",
        url: "/admin/photos",
        icon: Map,
    },
    {
        title: "Storage Jobs",
        url: "/admin/storage-jobs",
        icon: Trash2,
    },
    {
        title: "Audit Logs",
        url: "/admin/audit",
        icon: History,
    },
    {
        title: "System",
        url: "/admin/system",
        icon: Settings,
    },
];
export function AdminSidebar() {
    const location = useLocation();
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const handleSignOut = async () => {
        await signOut();
        navigate("/");
    };
    return (_jsxs(Sidebar, { collapsible: "icon", children: [_jsx(SidebarHeader, { children: _jsx(SidebarMenu, { children: _jsx(SidebarMenuItem, { children: _jsx(SidebarMenuButton, { size: "lg", asChild: true, children: _jsxs(Link, { to: "/admin", children: [_jsx("div", { className: "flex aspect-square size-8 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground", children: _jsx(LayoutDashboard, { className: "size-4" }) }), _jsxs("div", { className: "flex flex-col gap-0.5 leading-none", children: [_jsx("span", { className: "font-semibold", children: "Plano Admin" }), _jsx("span", { className: "", children: "Console" })] })] }) }) }) }) }), _jsx(SidebarContent, { children: _jsxs(SidebarGroup, { children: [_jsx(SidebarGroupLabel, { children: "Management" }), _jsx(SidebarGroupContent, { children: _jsx(SidebarMenu, { children: items.map((item) => (_jsx(SidebarMenuItem, { children: _jsx(SidebarMenuButton, { asChild: true, isActive: location.pathname === item.url, tooltip: item.title, children: _jsxs(Link, { to: item.url, children: [_jsx(item.icon, {}), _jsx("span", { children: item.title })] }) }) }, item.title))) }) })] }) }), _jsx(SidebarFooter, { children: _jsx(SidebarMenu, { children: _jsx(SidebarMenuItem, { children: _jsxs(SidebarMenuButton, { onClick: handleSignOut, children: [_jsx(LogOut, {}), _jsx("span", { children: "Sign out" })] }) }) }) }), _jsx(SidebarRail, {})] }));
}
