import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showLogo?: boolean;
  showNav?: boolean;
  showBack?: boolean;
  headerAction?: ReactNode;
}

export function AppLayout({ 
  children, 
  title, 
  showLogo = true,
  showNav = true,
  showBack = false,
  headerAction
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header title={title} showLogo={showLogo} showBack={showBack} action={headerAction} />
      {/* CHANGED: Reduced max-w-7xl to max-w-5xl to constrain width and make cards shorter */}
      <main className="pt-14 pb-20 max-w-5xl mx-auto w-full">
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
