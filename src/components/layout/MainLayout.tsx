import { useEffect, useState } from "react";
import { Outlet, useLocation, useRouteLoaderData } from "react-router";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import { MobileTopBar } from "./MobileTopBar";
import { AppTopNav } from "./AppTopNav";
import { ExploreShellProvider } from "./ExploreShellContext";
import { WaitlistSignupProvider } from "@/features/waitlist/WaitlistSignupProvider";

function MainLayoutInset({ hideTopInset }: { hideTopInset: boolean }) {
  return (
    <SidebarInset
      className={cn(
        "min-w-0 bg-surface-default",
        hideTopInset ? "pt-0" : "pt-14 md:pt-16"
      )}
      data-testid="main-layout"
    >
      <Outlet />
    </SidebarInset>
  );
}

/**
 * On desktop (md+): AppTopNav provides a sticky horizontal header; AppSidebar is hidden.
 * On mobile: MobileTopBar + AppSidebar (sheet) + BottomNav handle navigation.
 * SidebarProvider is retained for mobile sheet behavior (SidebarTrigger in MobileTopBar).
 */
function MainLayout() {
  const rootData = useRouteLoaderData("root") as
    | { sidebarOpen: boolean | null }
    | undefined;

  const location = useLocation();
  const [exploreHideTopChrome, setExploreHideTopChrome] = useState(false);

  const hideExploreTopChrome =
    location.pathname === "/explore" && exploreHideTopChrome;

  useEffect(() => {
    if (location.pathname !== "/explore") {
      setExploreHideTopChrome(false);
    }
  }, [location.pathname]);

  return (
    <ExploreShellProvider
      value={{ setExploreHideTopChrome }}
    >
      <WaitlistSignupProvider>
        <SidebarProvider
          defaultOpen={true}
          initialOpen={rootData?.sidebarOpen ?? undefined}
        >
          <AppSidebar />
          {!hideExploreTopChrome && <MobileTopBar />}
          {!hideExploreTopChrome && <AppTopNav />}
          <MainLayoutInset hideTopInset={hideExploreTopChrome} />
        </SidebarProvider>
      </WaitlistSignupProvider>
    </ExploreShellProvider>
  );
}

export { MainLayout };
export default MainLayout;
