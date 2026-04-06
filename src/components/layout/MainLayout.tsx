import { useEffect } from "react";
import { Outlet } from "react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useLoginTracker } from "@/features/auth/hooks/useLoginTracker";
import { usePresenceTracker } from "@/features/auth/hooks/usePresenceTracker";
import { logDiagnosticError } from "@/features/admin/api/diagnostics";
import { setSentryUser } from "@/lib/sentry";

/**
 * Sidebar is closed by default; opened via the floating SidebarTrigger below.
 *
 * collapsible="offcanvas" on AppSidebar means the sidebar overlays the
 * content on desktop (no permanent rail) — same Sheet behaviour as mobile.
 */
function MainLayout() {
  const { user, loading: authLoading } = useAuth();
  useLoginTracker();
  usePresenceTracker();

  useEffect(() => {
    if (authLoading) return;
    setSentryUser(user?.id ?? null);
  }, [user, authLoading]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logDiagnosticError("GlobalError", event.message, event.error?.stack);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logDiagnosticError("UnhandledRejection", String(event.reason));
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <div className="pointer-events-none fixed left-4 top-4 z-40 safe-area-pt">
        <SidebarTrigger
          className="pointer-events-auto border border-border-default bg-surface-card/95 shadow-md"
          aria-label="Open menu"
        />
      </div>
      <SidebarInset
        className="min-w-0 bg-surface-default"
        data-testid="main-layout"
      >
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

export { MainLayout };
export default MainLayout;