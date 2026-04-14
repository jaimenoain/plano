import { Activity, CalendarDays, Users, User, Play, Search, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";

type BottomNavItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  isActive?: (pathname: string) => boolean;
};

// Core navigation items (Events after Feed, before Explore — matches sidebar)
const navItems: BottomNavItem[] = [
  { icon: Activity, label: "Feed", path: "/" },
  {
    icon: CalendarDays,
    label: "Events",
    path: "/events",
    isActive: (pathname) => pathname === "/events" || pathname.startsWith("/events/"),
  },
  { icon: Play, label: "Explore", path: "/explore" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Users, label: "Connect", path: "/connect" },
  { icon: User, label: "You", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const isExplore = location.pathname === "/explore";

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 safe-area-pb border-t",
        isExplore
          ? "bg-[#0A0A0A] border-white/10 backdrop-blur-xl" /* palette-neutral-950 */
          : "bg-surface-default border-border-default"
      )}
    >
      <div className="flex items-center justify-around h-20 max-w-lg mx-auto px-2 pb-2">
        {navItems.map(({ icon: Icon, label, path, isActive: activeFn }) => {
          const isActive = (activeFn ?? ((p) => p === path))(location.pathname);

          return (
            <Link
              key={path}
              to={path}
              aria-label={label}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 relative",
                "flex-1 min-w-0 min-h-[64px] rounded-sm border-t-2",
                isActive ? "border-text-primary" : "border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-all duration-300",
                  isActive ? "text-text-primary" : "text-text-secondary"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-widest",
                  isActive ? "text-text-primary" : "text-text-secondary"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
