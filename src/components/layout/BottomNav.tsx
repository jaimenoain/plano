import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { isNavItemActive, navItemsFor } from "./navigation";

export function BottomNav() {
  const location = useLocation();
  const isExplore = location.pathname === "/explore";
  const navItems = navItemsFor("bottom");

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 safe-area-pb border-t",
        isExplore
          ? "bg-surface-inverse border-white/10 backdrop-blur-xl"
          : "bg-surface-default border-border-default"
      )}
    >
      <div className="flex items-center justify-around h-20 max-w-lg mx-auto px-2 pb-2">
        {navItems.map((item) => {
          const { icon: Icon, label, path } = item;
          if (!Icon) return null;
          const isActive = isNavItemActive(item, location.pathname);

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
