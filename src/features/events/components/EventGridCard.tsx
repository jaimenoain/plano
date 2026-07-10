import { useState } from "react";
import { Link } from "react-router";
import type { EventCardDTO } from "@/features/events/types";
import { getEventUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import {
  eventDateParts,
  formatEventListWhen,
  organiserLine,
} from "@/features/events/components/eventFormat";

/**
 * Kit `.ev-datecard` — a bordered 64px chip: black month band over the day numeral.
 * Meta furniture beside an event's "when" line, never a stand-in for its photo.
 */
export function EventDateCard({ iso, className }: { iso: string; className?: string }) {
  const { day, month } = eventDateParts(iso);
  return (
    <div className={cn("w-16 shrink-0 border border-border-default text-center", className)}>
      <span className="block bg-brand-primary py-1 text-2xs font-semibold uppercase tracking-widest text-brand-primary-foreground">
        {month}
      </span>
      <span className="block px-1 pb-2.5 pt-2 text-3xl font-bold leading-none tracking-tight text-text-primary">
        {day}
      </span>
    </div>
  );
}

export function EventGridCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="aspect-4/3 w-full bg-surface-muted" />
      <div className="space-y-2 pt-4">
        <div className="h-7 w-3/4 bg-surface-muted" />
        <div className="h-4 w-1/2 bg-surface-muted" />
      </div>
    </div>
  );
}

export function EventGridCard({ event }: { event: EventCardDTO }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(event.coverImageUrl?.trim()) && !coverFailed;

  return (
    <Link
      to={getEventUrl(event)}
      className="group flex flex-col touch-manipulation focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
    >
      <div className="aspect-4/3 w-full overflow-hidden">
        {showCover ? (
          <img
            src={event.coverImageUrl!}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="photo-placeholder h-full w-full" data-label={event.title} />
        )}
      </div>

      <p className="eyebrow mt-4 tracking-widest">{organiserLine(event)}</p>

      <h2 className="mt-2 line-clamp-2 text-2xl font-bold leading-tight tracking-tight text-text-primary transition-colors group-hover:text-text-secondary">
        {event.title}
      </h2>

      <div className="mt-2.5 flex flex-col gap-0.5">
        <span className="meta-code">{formatEventListWhen(event.startAt)}</span>
        {event.address ? (
          <span className="truncate text-sm text-text-secondary">{event.address}</span>
        ) : null}
      </div>
    </Link>
  );
}
