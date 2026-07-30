import { Link } from "react-router";
import { BookOpen, Map, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CountryActions — what a visitor does next: see it on the map, start an
 * itinerary, or add what we're missing. Mirrors the city guide's action strip.
 */
export function CountryActions({
  countryName,
  exploreMapHref,
}: {
  countryName: string;
  /** The search map, pre-framed on this country (see `buildCountryMapUrl`). */
  exploreMapHref: string;
}) {
  const actions = [
    { to: exploreMapHref, icon: Map, label: "Explore the map", emphasize: true },
    { to: "/collections", icon: BookOpen, label: "Plan an itinerary", emphasize: false },
    // No country pre-fill: /buildings/new reads only name/lat/lng/returnTo, and
    // the form derives the country from the location the member picks.
    { to: "/buildings/new", icon: Plus, label: "Add a building", emphasize: false },
  ] as const;

  return (
    <nav
      aria-label={`${countryName} actions`}
      className="grid gap-0 border-b border-border-default sm:grid-cols-3"
    >
      {actions.map(({ to, icon: Icon, label, emphasize }) => (
        <Link
          key={label}
          to={to}
          className={cn(
            "group flex items-center justify-between gap-3 border-t border-border-default px-3 py-5 transition-colors first:border-t-0 sm:border-t-0 sm:border-l sm:px-5 sm:py-6 sm:first:border-l-0",
            emphasize ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                emphasize
                  ? "text-text-primary group-hover:text-text-secondary"
                  : "text-text-secondary group-hover:text-text-primary",
              )}
              aria-hidden
            />
            <span className="text-xs font-medium uppercase tracking-widest transition-colors group-hover:text-text-secondary">
              {label}
            </span>
          </span>
          {/* The arrow on the emphasised action is one of the four sanctioned lime uses. */}
          <span
            className={cn(
              "shrink-0 text-xs text-text-primary transition-all group-hover:translate-x-[3px]",
              emphasize && "group-hover:text-brand-accent",
            )}
            aria-hidden
          >
            →
          </span>
        </Link>
      ))}
    </nav>
  );
}
