import { useState } from "react";
import { Link } from "react-router";
import type { EventCardDTO } from "@/features/events/types";
import { getEventUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import { EventDateCard } from "@/features/events/components/EventGridCard";
import { formatEventListWhen, organiserLine } from "@/features/events/components/eventFormat";

export function EventHeroCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid animate-pulse border border-border-default md:grid-cols-[1.35fr_1fr]", className)}>
      <div className="aspect-4/3 w-full bg-surface-muted" />
      <div className="flex flex-col justify-between gap-8 p-8 sm:p-10">
        <div className="h-11 w-4/5 bg-surface-muted" />
        <div className="h-16 w-1/2 bg-surface-muted" />
      </div>
    </div>
  );
}

/**
 * Kit `.ev-hero` — the featured event as a bordered two-column article: photo left,
 * black-on-white body right. Border only: no shadow, no radius, no scrim.
 */
export function EventHeroCard({ event }: { event: EventCardDTO }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(event.coverImageUrl?.trim()) && !coverFailed;

  return (
    <article className="grid border border-border-default bg-surface-card md:grid-cols-[1.35fr_1fr]">
      <div className="aspect-4/3 w-full overflow-hidden">
        {showCover ? (
          <img
            src={event.coverImageUrl!}
            alt=""
            loading="eager"
            className="h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="photo-placeholder h-full w-full" data-label={event.title} />
        )}
      </div>

      <div className="flex flex-col justify-between p-8 sm:p-10">
        <div>
          <p className="eyebrow tracking-widest">Featured</p>

          <h2 className="mt-5 text-4xl font-bold leading-none tracking-tight text-text-primary">
            <Link
              to={getEventUrl(event)}
              className="transition-colors hover:text-text-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              {event.title}
            </Link>
          </h2>

          <div className="mt-7 flex items-center gap-5">
            <EventDateCard iso={event.startAt} />
            <p className="text-sm leading-relaxed text-text-secondary">
              {formatEventListWhen(event.startAt)}
              {event.address ? (
                <>
                  <br />
                  <span className="font-medium text-text-primary">{event.address}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <span className="meta-code uppercase">{organiserLine(event)}</span>
          <Link to={getEventUrl(event)} className="cta-link">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
