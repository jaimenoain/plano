import { useState } from "react";
import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import type { EventCardDTO } from "@/features/events/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatEventListWhen(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM · HH:mm", { locale: enGB });
  } catch {
    return "";
  }
}

function organiserLine(event: EventCardDTO): string {
  if (event.isSelfHosted && event.claimStatus === "claimed") {
    if (event.submittedBy.username) return `Hosted by @${event.submittedBy.username}`;
    return "Hosted by organiser";
  }
  return "Community shared";
}

export function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-4 rounded-sm border border-border-default bg-surface-card p-4 animate-pulse",
        className,
      )}
    >
      <div className="h-[180px] w-[120px] shrink-0 rounded-sm bg-surface-muted" />
      <div className="min-w-0 flex-1 space-y-3 py-1">
        <div className="h-5 w-2/3 max-w-md rounded-sm bg-surface-muted" />
        <div className="h-4 w-48 rounded-sm bg-surface-muted" />
        <div className="h-4 w-full max-w-sm rounded-sm bg-surface-muted" />
        <div className="h-4 w-40 rounded-sm bg-surface-muted" />
      </div>
    </div>
  );
}

export function EventCard({ event }: { event: EventCardDTO }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(event.coverImageUrl) && !coverFailed;

  return (
    <Link
      to={`/events/${event.slug}`}
      className="flex gap-4 rounded-sm border border-border-default bg-surface-card p-4 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
    >
      <div className="w-[120px] shrink-0">
        {showCover ? (
          <img
            src={event.coverImageUrl!}
            alt=""
            width={120}
            height={180}
            className="h-[180px] w-[120px] rounded-sm object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="h-[180px] w-[120px] rounded-sm bg-surface-muted" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <div className="flex flex-wrap items-start gap-2">
          <h2 className="line-clamp-2 min-w-0 flex-1 text-base font-black text-text-primary">{event.title}</h2>
          {event.claimStatus === "unclaimed" ? (
            <Badge variant="secondary" className="shrink-0">
              Claim
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-text-secondary">{formatEventListWhen(event.startAt)}</p>
        {event.address ? (
          <p className="truncate text-sm text-text-secondary">{event.address}</p>
        ) : null}
        <p className="text-sm text-text-secondary">{organiserLine(event)}</p>
      </div>
    </Link>
  );
}
