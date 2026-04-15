import { useState } from "react";
import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import type { EventCardDTO } from "@/features/events/types";
import { getEventUrl } from "@/utils/url";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatProfileCardWhen(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM · HH:mm", { locale: enGB });
  } catch {
    return "";
  }
}

export function EventProfileCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3 py-3 animate-pulse", className)}>
      <div className="h-[72px] w-[72px] shrink-0 rounded-md bg-surface-muted" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <div className="h-4 w-3/4 max-w-xs rounded-sm bg-surface-muted" />
        <div className="h-3 w-40 rounded-sm bg-surface-muted" />
        <div className="h-3 w-full max-w-sm rounded-sm bg-surface-muted" />
      </div>
    </div>
  );
}

export type ProfileEventAttendanceChip = "going" | "interested" | null;

export function EventProfileCard({
  event,
  profileUserId,
  viewingUserId,
  isOwnProfile,
  attendanceChip,
  className,
}: {
  event: EventCardDTO;
  profileUserId: string;
  viewingUserId: string | null;
  isOwnProfile: boolean;
  attendanceChip: ProfileEventAttendanceChip;
  className?: string;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(event.coverImageUrl) && !coverFailed;

  const addedByYou = Boolean(viewingUserId && event.submittedBy.userId === viewingUserId);
  const addedByProfileCredit =
    !addedByYou && event.submittedBy.userId === profileUserId && Boolean(event.submittedBy.username?.trim());

  return (
    <Link
      to={getEventUrl(event)}
      className={cn(
        "flex gap-3 py-3 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
        className,
      )}
    >
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md bg-surface-muted">
        {showCover ? (
          <img
            src={event.coverImageUrl!}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-start gap-2">
          <p className="min-w-0 flex-1 text-sm font-black leading-snug text-text-primary line-clamp-2">{event.title}</p>
          {isOwnProfile && attendanceChip ? (
            <Badge variant={attendanceChip === "going" ? "success" : "secondary"} className="shrink-0 text-2xs-plus">
              {attendanceChip === "going" ? "Going" : "Interested"}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-text-secondary">{formatProfileCardWhen(event.startAt)}</p>
        {event.address ? <p className="truncate text-xs text-text-secondary">{event.address}</p> : null}
        {addedByYou ? (
          <span className="inline-flex rounded-sm border border-border-default bg-surface-muted px-2 py-0.5 text-2xs text-text-secondary">
            Added to Plano by you
          </span>
        ) : null}
        {addedByProfileCredit ? (
          <span className="inline-flex rounded-sm border border-border-default bg-surface-muted px-2 py-0.5 text-2xs text-text-secondary">
            Added by @{event.submittedBy.username}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
