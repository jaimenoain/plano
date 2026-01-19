import { Home, Search, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

// Reduced to the 3 core navigation items
const navItems = [
  { icon: Home, label: "Feed", path: "/" },
  { icon: Search, label: "Find", path: "/search" },
  { icon: Users, label: "Groups", path: "/groups" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass safe-area-pb border-t border-white/10">
      {/* Increased height to h-20 to accommodate larger text/icons comfortably */}
      <div className="flex items-center justify-around h-20 max-w-lg mx-auto px-2 pb-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || (path === "/groups" && location.pathname.startsWith("/groups"));
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative",
                // Minimum touch target width for accessibility
                "min-w-[64px] min-h-[64px] rounded-xl",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <div className="relative">
                <Icon 
                  className={cn("transition-all duration-300", isActive ? "h-6 w-6" : "h-6 w-6")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              {/* Increased font size for readability */}
              <span className={cn("text-xs font-medium tracking-wide", isActive ? "opacity-100" : "opacity-80")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
