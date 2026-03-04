import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";

export function MainLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const isPublicHome = !user && location.pathname === "/";

  if (isPublicHome) {
    return (
      <SidebarProvider defaultOpen={false}>
        <Outlet />
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="min-w-0" data-testid="main-layout">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
