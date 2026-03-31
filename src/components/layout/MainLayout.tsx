import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

/**
 * Always mount AppSidebar so logged-out home and every route share the same shell.
 * Desktop: `open` is controlled so off-canvas collapse cannot leave nav stuck off-screen.
 * Mobile: sheet visibility still uses `openMobile` inside SidebarProvider.
 */
export function MainLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset
        className="min-w-0 bg-surface-default"
        data-testid="main-layout"
      >
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
