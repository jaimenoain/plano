import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
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
  showHeader = true
}: AppLayoutProps) {
  return (
    <>
      {showHeader && (
        <div className="md:hidden">
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
        </div>
      )}
      {/* CHANGED: Reduced max-w-7xl to max-w-5xl to constrain width and make cards shorter */}
      <div className={cn(
        showHeader && "pt-16 md:pt-0",
        "w-full overflow-x-hidden",
        !isFullScreen && "max-w-5xl mx-auto",
        isFullScreen && "h-full flex flex-col flex-1",
        showNav && "pb-20 md:pb-0"
      )}>
        {children}
      </div>
      {showNav && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </>
  );
}
