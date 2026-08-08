import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  count: number;
  className?: string;
  iconClassName?: string;
}

/**
 * Shared bell icon + unread-count badge, used by every nav surface (desktop
 * top nav, mobile top bar, legacy Header). A single presentational component
 * so the three surfaces can't drift again — see docs/Roadmap.md Task 6.3.
 */
export function NotificationBell({ count, className, iconClassName }: NotificationBellProps) {
  const hasUnread = count > 0;
  const label = hasUnread ? `${count} unread` : "";

  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      <Bell className={cn("h-4 w-4", iconClassName)} />
      {hasUnread && (
        <span
          aria-live="polite"
          className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full border-[1.5px] border-surface-default bg-brand-accent px-1 text-[10px] font-bold leading-none text-brand-accent-foreground"
        >
          <span className="sr-only">{label}</span>
          <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
        </span>
      )}
    </span>
  );
}
