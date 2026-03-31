import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
export default function AdminLayout() {
    return (_jsxs(SidebarProvider, { children: [_jsx(AdminSidebar, {}), _jsxs(SidebarInset, { children: [_jsx("header", { className: "flex h-16 shrink-0 items-center gap-2 border-b px-4", children: _jsx(SidebarTrigger, { className: "-ml-1" }) }), _jsx("div", { className: "flex-1 space-y-4 p-8 pt-6", children: _jsx(Outlet, {}) })] })] }));
}
