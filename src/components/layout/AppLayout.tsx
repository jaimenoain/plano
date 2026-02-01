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
    <div className="min-h-screen bg-background">
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
      {/* CHANGED: Reduced max-w-7xl to max-w-5xl to constrain width and make cards shorter */}
      <main className={cn(
        showHeader && "pt-16",
        "w-full",
        !isFullScreen && "max-w-5xl mx-auto",
        showNav && "pb-20"
      )}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
