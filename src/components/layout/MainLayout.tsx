import { useEffect } from "react";
import { Outlet, useLocation, useRouteLoaderData } from "react-router";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileTopBar } from "./MobileTopBar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useLoginTracker } from "@/features/auth/hooks/useLoginTracker";
import { usePresenceTracker } from "@/features/auth/hooks/usePresenceTracker";
import { logDiagnosticError } from "@/features/admin/api/diagnostics";
import { setSentryUser } from "@/lib/sentry";
import { cn } from "@/lib/utils";
import { PlanoLogo } from "@/components/common/PlanoLogo";

function FloatingTrigger() {
  const { open } = useSidebar();
  return (
    <div className="pointer-events-none hidden md:flex fixed left-4 top-4 z-40 safe-area-pt">
      <div className="pointer-events-auto flex flex-col items-center gap-1">
        <SidebarTrigger className="h-auto min-h-11 min-w-14 w-auto border-0 bg-transparent p-2 shadow-none hover:bg-transparent active:scale-100 [&_svg]:!size-6" />
        {!open && (
          <div className="w-14 h-16 flex items-center justify-center overflow-hidden">
            <PlanoLogo className="text-black -rotate-90 text-[12px]" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Sidebar is open by default on first visit; preference is stored in a cookie
 * and restored on reload (root loader reads `sidebar:state` for SSR so there is
 * no flash of the wrong state). In-app navigation does not change open/closed state.
 * The floating SidebarTrigger toggles the menu.
 *
 * collapsible="offcanvas" on AppSidebar: the panel is fixed and does not
 * consume flex width (spacer stays w-0). Desktop inset padding clears the
 * overlay when open and the floating trigger when closed.
 */
function MainLayoutInset() {
  const { open, isMobile } = useSidebar();

  return (
    <SidebarInset
      className={cn(
        "min-w-0 bg-surface-default transition-[padding-left] duration-200 ease-linear",
        // Mobile: pad top to clear the fixed MobileTopBar (h-14 + safe-area-pt).
        // Desktop: no top padding from the global bar.
        "pt-14 md:pt-0",
        !isMobile && open && "md:pl-[var(--sidebar-width)]",
        !isMobile && !open && "md:pl-16",
      )}
      data-testid="main-layout"
    >
      <Outlet />
    </SidebarInset>
  );
}

function MainLayout() {
  const rootData = useRouteLoaderData("root") as
    | { sidebarOpen: boolean | null }
    | undefined;
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const isExplorePage = location.pathname === "/explore";
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
    <SidebarProvider
      defaultOpen={true}
      initialOpen={rootData?.sidebarOpen ?? undefined}
    >
      <AppSidebar />
      {/* Mobile top bar — replaces the floating trigger on small screens */}
      <MobileTopBar />
      {/* Floating trigger — desktop only, hidden on mobile where MobileTopBar takes over */}
      {!isExplorePage && <FloatingTrigger />}
      <MainLayoutInset />
    </SidebarProvider>
  );
}

export { MainLayout };
export default MainLayout;