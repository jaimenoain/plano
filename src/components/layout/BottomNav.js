import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity, Users, User, Play, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
// Core navigation items
const navItems = [
    { icon: Activity, label: "Feed", path: "/" },
    { icon: Play, label: "Explore", path: "/explore" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: Users, label: "Connect", path: "/connect" },
    { icon: User, label: "You", path: "/profile" },
];
export function BottomNav() {
    const location = useLocation();
    const isExplore = location.pathname === "/explore";
    return (_jsx("nav", { className: cn("fixed bottom-0 left-0 right-0 z-50 safe-area-pb border-t", isExplore
            ? "bg-[#0A0A0A] border-white/10 backdrop-blur-xl" /* palette-neutral-950 */
            : "bg-surface-card border-border-default"), children: _jsx("div", { className: "flex items-center justify-around h-20 max-w-lg mx-auto px-2 pb-2", children: navItems.map(({ icon: Icon, label, path }) => {
                const isActive = location.pathname === path;
                return (_jsxs(Link, { to: path, "aria-label": label, className: cn("flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative", "flex-1 min-w-0 min-h-[64px] rounded-sm border-t-2", isActive ? "border-brand-primary" : "border-transparent"), children: [_jsx(Icon, { className: cn("h-6 w-6 transition-all duration-300", isActive ? "text-text-primary" : "text-text-secondary"), strokeWidth: isActive ? 2.5 : 2 }), _jsx("span", { className: cn("text-xs font-medium tracking-wide", isActive ? "text-text-primary" : "text-text-secondary"), children: label })] }, path));
            }) }) }));
}
