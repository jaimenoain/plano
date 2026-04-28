import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { SiteFooter } from "./SiteFooter";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  variant?: 'default' | 'home' | 'map';
  searchBar?: ReactNode;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  showLogo?: boolean;
  showNav?: boolean;
  showBack?: boolean;
  headerAction?: ReactNode;
  isFullScreen?: boolean;
  showHeader?: boolean;
  /** When true, the shell layout (e.g. MainLayout `SidebarInset`) already applies top padding for the fixed app nav — skip extra `pt-16` so content (e.g. hero) sits flush under it. */
  shellProvidesTopInset?: boolean;
  fullWidth?: boolean;
}

export function AppLayout({ 
  children, 
  title, 
  variant,
  searchBar,
  leftAction,
  rightAction,
  showLogo = true,
  showNav = true,
  showBack = false,
  headerAction,
  isFullScreen = false,
  showHeader = false,
  shellProvidesTopInset = false,
  fullWidth = false
}: AppLayoutProps) {
  void fullWidth;

  // Footer is hidden on map and full-screen variants — those are immersive
  // surfaces where a footer would be obscured or intrusive.
  const showFooter = variant !== 'map' && !isFullScreen;

  return (
    <>
      {showHeader && (
        <Header
          title={title}
          variant={variant}
          searchBar={searchBar}
          leftAction={leftAction}
          rightAction={rightAction}
          showLogo={showLogo}
          showBack={showBack}
          action={headerAction}
        />
      )}
      <div className={cn(
        showHeader && !shellProvidesTopInset && "pt-16",
        "w-full min-w-0",
        isFullScreen && "min-h-0 h-full flex flex-col flex-1",
        showNav && "pb-20 md:pb-0"
      )}>
        {children}
      </div>
      {showFooter && <SiteFooter />}
      {showNav && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </>
  );
}