import { useState } from "react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { EventCardDTO } from "@/features/events/types";
import { getEventUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import { EventDateTile } from "@/features/events/components/EventGridCard";
import {
  formatEventListWhen,
  organiserAvatarUrl,
  organiserLine,
} from "@/features/events/components/eventFormat";

export function EventHeroCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("aspect-[16/9] w-full animate-pulse bg-surface-muted md:aspect-[21/9]", className)} />
  );
}

export function EventHeroCard({ event }: { event: EventCardDTO }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(event.coverImageUrl?.trim()) && !coverFailed;
  const avatarUrl = organiserAvatarUrl(event);

  return (
    <Link
      to={getEventUrl(event)}
      className="group relative block aspect-[16/9] w-full overflow-hidden bg-surface-muted touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 md:aspect-[21/9]"
    >
      {showCover ? (
        <img
          src={event.coverImageUrl!}
          alt=""
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <EventDateTile iso={event.startAt} />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-text-inverse sm:p-8">
        <span className="text-2xs font-medium uppercase tracking-[0.2em] text-brand-accent">Featured</span>
        <h2 className="line-clamp-2 max-w-3xl text-2xl font-black leading-tight sm:text-4xl">
          {event.title}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-inverse/90">
          <span>{formatEventListWhen(event.startAt)}</span>
          {event.address ? (
            <>
              <span aria-hidden className="text-text-inverse/50">·</span>
              <span className="truncate">{event.address}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Avatar className="h-6 w-6 border border-white/20">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-surface-inverse text-2xs font-medium text-text-inverse">
              {(event.organiser?.displayName ?? event.submittedBy.username ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm text-text-inverse/90">{organiserLine(event)}</span>
        </div>
      </div>
    </Link>
  );
}
