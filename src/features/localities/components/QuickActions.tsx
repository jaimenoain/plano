import { Link } from "react-router";
import { BookOpen, Map, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// QuickActions — primary CTAs
// ---------------------------------------------------------------------------
export function QuickActions({
  city,
  citySlug,
  countryCode,
}: {
  city: string;
  citySlug: string;
  countryCode: string;
}) {
  const actions = [
    {
      to: `/map?locality=${citySlug}&cc=${countryCode}`,
      icon: Map,
      label: "Explore map",
      emphasize: true,
    },
    {
      to: `/collections`,
      icon: BookOpen,
      label: "Create itinerary",
      emphasize: false,
    },
    {
      to: `/buildings/new?city=${encodeURIComponent(city)}`,
      icon: Plus,
      label: "Add a building",
      emphasize: false,
    },
  ] as const;

  return (
    <nav
      aria-label="City actions"
      className="grid gap-0 border-b border-border-default sm:grid-cols-3"
    >
      {actions.map(({ to, icon: Icon, label, emphasize }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            "group flex items-center justify-between gap-3 border-t border-border-default px-3 py-5 transition-colors first:border-t-0 sm:border-t-0 sm:border-l sm:px-5 sm:py-6 sm:first:border-l-0",
            emphasize
              ? "text-text-primary"
              : "text-text-secondary hover:text-text-primary",
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
