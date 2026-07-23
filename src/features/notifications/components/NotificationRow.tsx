import { type KeyboardEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Notification } from "../types";
import { notificationIcon, notificationTitle, notificationText } from "./notificationContent";

interface NotificationRowProps {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}

/**
 * Kit `.nt-row` — an unboxed hairline row. The lime square at the right edge is the sole unread
 * signal (`.nt-unread`, one of the four sanctioned lime uses), so the row itself never tints.
 */
export function NotificationRow({ notification: n, onSelect }: NotificationRowProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(n);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(n)}
      onKeyDown={handleKeyDown}
      className="flex items-start gap-4 px-4 sm:px-6 py-4 border-b border-border-default last:border-0 cursor-pointer transition-colors hover:bg-surface-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent"
    >
      <div className="relative shrink-0 mt-0.5">
        <Avatar className="h-9 w-9">
          <AvatarImage src={n.actor?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {n.actor?.username?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5 bg-surface-default p-px">
          {notificationIcon(n.type)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary leading-snug">{notificationTitle(n)}</p>
        <p className="text-sm text-text-secondary leading-snug line-clamp-2 mt-0.5">
          {notificationText(n)}
        </p>
        <p className="text-2xs text-text-disabled mt-1.5 uppercase tracking-wide">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>

      {!n.is_read && (
        <div
          data-testid="notification-unread-dot"
          className="h-1.5 w-1.5 bg-brand-accent shrink-0 mt-2"
          aria-label="Unread"
        />
      )}
    </div>
  );
}
