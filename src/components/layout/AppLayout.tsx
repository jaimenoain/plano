import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showLogo?: boolean;
  showNav?: boolean;
  showBack?: boolean;
  headerAction?: ReactNode;
  isFullScreen?: boolean;
}

export function AppLayout({ 
  children, 
  title, 
  showLogo = true,
  showNav = true,
  showBack = false,
  headerAction,
  isFullScreen = false
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header title={title} showLogo={showLogo} showBack={showBack} action={headerAction} />
      {/* CHANGED: Reduced max-w-7xl to max-w-5xl to constrain width and make cards shorter */}
      <main className={cn(
        "pt-16 w-full",
        !isFullScreen && "max-w-5xl mx-auto",
        showNav && "pb-20"
      )}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
