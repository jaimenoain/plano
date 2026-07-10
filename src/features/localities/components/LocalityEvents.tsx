import { Link } from "react-router";
import { CalendarDays } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

export interface LocalityEvent {
  id: string;
  name: string;
  slug: string;
  startDate: string; // ISO
  locationLabel: string | null;
  isFree: boolean;
  tag: string | null;
}

// ---------------------------------------------------------------------------
// LocalityEvents
// ---------------------------------------------------------------------------
export function LocalityEvents({
  events,
  citySlug,
  countryCode,
}: {
  events: LocalityEvent[];
  citySlug: string;
  countryCode: string;
}) {
  if (events.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <SectionLabel>Events</SectionLabel>
        <Link
          to={`/events/${countryCode.toLowerCase()}/${citySlug}`}
          className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
        >
          All events →
        </Link>
      </div>

      <div className="space-y-0">
        {events.map((event) => {
          const date = new Date(event.startDate);
          const month = date
            .toLocaleString("en", { month: "short" })
            .toUpperCase();
          const day = date.getDate();

          return (
            <Link
              key={event.id}
              to={`/events/${countryCode.toLowerCase()}/${citySlug}/${event.slug}`}
              className="group flex items-start gap-4 border-b border-border-default py-4 first:border-t first:border-border-default"
            >
              {/* Date block */}
              <div className="w-10 shrink-0 text-center">
                <span className="block text-[9px] font-medium uppercase tracking-widest text-text-disabled">
                  {month}
                </span>
                <span className="block text-xl font-bold leading-none tracking-tight text-text-primary">
                  {day}
                </span>
              </div>

              {/* Event info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary transition-colors group-hover:text-text-secondary">
                  {event.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {event.locationLabel ? (
                    <span className="text-[11px] text-text-disabled">
                      {event.locationLabel}
                    </span>
                  ) : null}
                  {event.tag ? (
                    <span className="border border-border-default px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-text-disabled">
                      {event.tag}
                    </span>
                  ) : null}
                  {event.isFree ? (
                    <span className="border border-border-default px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-text-disabled">
                      Free
                    </span>
                  ) : null}
                </div>
              </div>

              <CalendarDays className="mt-1 h-3.5 w-3.5 shrink-0 text-text-disabled opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
