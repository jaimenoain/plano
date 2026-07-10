import { useState } from "react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { EventCardDTO } from "@/features/events/types";
import { getEventUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import {
  eventDateParts,
  formatEventChip,
  formatEventListWhen,
  organiserAvatarUrl,
  organiserLine,
} from "@/features/events/components/eventFormat";

/** Branded placeholder shown when an event has no cover image. */
export function EventDateTile({ iso, className }: { iso: string; className?: string }) {
  const { day, month, weekday } = eventDateParts(iso);
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center bg-brand-primary text-brand-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <span className="text-2xs font-medium uppercase tracking-[0.2em] text-brand-accent">{weekday}</span>
      <span className="text-5xl font-black leading-none">{day}</span>
      <span className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-brand-accent">{month}</span>
    </div>
  );
}

export function EventGridCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="aspect-4/3 w-full bg-surface-muted" />
      <div className="space-y-2 pt-3">
        <div className="h-5 w-3/4 rounded-sm bg-surface-muted" />
        <div className="h-4 w-1/2 rounded-sm bg-surface-muted" />
        <div className="h-4 w-2/3 rounded-sm bg-surface-muted" />
      </div>
    </div>
  );
}

export function EventGridCard({ event }: { event: EventCardDTO }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(event.coverImageUrl?.trim()) && !coverFailed;
  const avatarUrl = organiserAvatarUrl(event);

  return (
    <Link
      to={getEventUrl(event)}
      className="group flex flex-col touch-manipulation transition-colors hover:bg-surface-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-surface-muted">
        {showCover ? (
          <>
            <img
              src={event.coverImageUrl!}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setCoverFailed(true)}
            />
            <span className="absolute left-2 top-2 bg-brand-primary px-2 py-1 text-2xs font-medium uppercase tracking-[0.15em] text-brand-primary-foreground">
              {formatEventChip(event.startAt)}
            </span>
          </>
        ) : (
          <EventDateTile iso={event.startAt} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-1 pb-5 pt-3">
        <h2 className="line-clamp-2 text-base font-black text-text-primary">{event.title}</h2>
        <p className="text-sm text-text-secondary">{formatEventListWhen(event.startAt)}</p>
        {event.address ? (
          <p className="truncate text-sm text-text-secondary">{event.address}</p>
        ) : null}
        <div className="mt-auto flex items-center gap-2 pt-1.5">
          <Avatar className="h-5 w-5">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-2xs font-medium text-text-secondary">
              {(event.organiser?.displayName ?? event.submittedBy.username ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="truncate text-sm text-text-secondary">{organiserLine(event)}</p>
        </div>
      </div>
    </Link>
  );
}
