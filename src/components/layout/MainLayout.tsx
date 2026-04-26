import { Outlet, useRouteLoaderData } from "react-router";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileTopBar } from "./MobileTopBar";
import { AppTopNav } from "./AppTopNav";


function MainLayoutInset() {
  return (
    <SidebarInset
      className="min-w-0 bg-surface-default pt-14 md:pt-16"
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

  return (
    <SidebarProvider
      defaultOpen={true}
      initialOpen={rootData?.sidebarOpen ?? undefined}
    >
      <AppSidebar />
      <MobileTopBar />
      <AppTopNav />
      <MainLayoutInset />
    </SidebarProvider>
  );
}

export { MainLayout };
export default MainLayout;
