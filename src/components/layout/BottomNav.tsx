import { Activity, Building2, Users, User, Compass } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

// Core navigation items
const navItems = [
  { icon: Activity, label: "Feed", path: "/" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: Building2, label: "Buildings", path: "/search" },
  { icon: Users, label: "Connect", path: "/groups" },
  { icon: User, label: "You", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass safe-area-pb border-t border-border">
      {/* Increased height to h-20 to accommodate larger text/icons comfortably */}
      <div className="flex items-center justify-around h-20 max-w-lg mx-auto px-2 pb-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || (path === "/groups" && location.pathname.startsWith("/groups"));
          
          return (
            <Link
              key={path}
              to={path}
              aria-label={label}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative",
                // Minimum touch target width for accessibility
                "min-w-[64px] min-h-[64px] rounded-xl",
                isActive 
                  ? "text-primary" 
                  : "text-gray-400 hover:text-primary"
              )}
            >
              <div className="relative flex flex-col items-center">
                <Icon 
                  className={cn("transition-all duration-300", isActive ? "h-6 w-6" : "h-6 w-6")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <div className="absolute -bottom-3 w-1.5 h-1.5 bg-[#EEFF41] rounded-full" />
                )}
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
