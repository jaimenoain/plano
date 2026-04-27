import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { FeedEventAttendance } from "@/types/feed";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM · HH:mm", { locale: enGB });
  } catch {
    return "";
  }
}

function actorLine(actors: FeedEventAttendance["actors"]): ReactNode {
  const withUser = actors.filter((a) => a.username?.trim());
  if (withUser.length === 0) {
    return <>Someone is going to </>;
  }
  const linkUser = (u: (typeof withUser)[0]) => (
    <Link
      key={u.username ?? ""}
      to={`/profile/${u.username}`}
      className="font-medium text-text-primary underline-offset-2 hover:underline"
    >
      @{u.username}
    </Link>
  );
  if (withUser.length === 1) {
    return (
      <>
        {linkUser(withUser[0])} is going to{" "}
      </>
    );
  }
  if (withUser.length === 2) {
    return (
      <>
        {linkUser(withUser[0])} and {linkUser(withUser[1])} are going to{" "}
      </>
    );
  }
  const others = withUser.length - 2;
  return (
    <>
      {linkUser(withUser[0])}, {linkUser(withUser[1])} and {others} other{others === 1 ? "" : "s"} are going to{" "}
    </>
  );
}

export interface FeedEventAttendanceRowProps {
  entry: FeedEventAttendance;
  className?: string;
}

export function FeedEventAttendanceRow({ entry, className }: FeedEventAttendanceRowProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(entry.coverImageUrl) && !coverFailed;
  const actorNodes = actorLine(entry.actors);
  const whenLabel = formatWhen(entry.startAt);

  return (
    <div
      data-testid={`feed-event-attendance-${entry.eventId}`}
      className={cn(
        "group/event-row flex min-w-0 cursor-pointer items-center gap-[18px] border-b border-border-default py-6 transition-colors hover:bg-surface-muted/30",
        className,
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-none bg-surface-muted">
        {showCover ? (
          <img
            src={entry.coverImageUrl!}
            alt=""
            className="h-full w-full object-cover grayscale-[0.2] transition-transform duration-500 group-hover/event-row:scale-105"
            loading="lazy"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-secondary">
            <CalendarDays className="h-6 w-6" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="min-w-0 font-sans text-2xs uppercase tracking-[0.14em] text-text-secondary">
          <span className="font-medium text-text-primary">{actorNodes}</span>
        </p>
        <Link
          // TODO: enrich FeedEventAttendance with countryCode + citySlug to emit locality-scoped URL
          to={`/events/${entry.slug}`}
          className="min-w-0 font-sans text-[17px] font-semibold tracking-[-0.015em] leading-tight text-text-primary line-clamp-1 transition-opacity hover:opacity-80"
        >
          {entry.title}
        </Link>
        {whenLabel ? (
          <p className="font-mono text-[10px] uppercase tracking-normal text-text-disabled">
            {whenLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
