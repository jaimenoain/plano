/**
 * The chrome that makes /map read as an achievement, not a filter: a hairline
 * five-figure stats band over the map, and the first-run "Start your map"
 * invitation when the library is empty.
 *
 * Rendered inside SearchPage's map container (the `masthead` slot), so
 * positioning is absolute within the map surface. On mobile the band drops
 * below the floating search bar; on desktop it sits flush with the top edge.
 */
import { Link } from "react-router";
import { useAuth } from "@/features/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { useLibraryEntries } from "../hooks/useLibraryEntries";
import { computeLibraryStats } from "../utils/libraryStats";

const CELLS: Array<{ key: keyof ReturnType<typeof computeLibraryStats>; label: string }> = [
  { key: "visited", label: "Visited" },
  { key: "saved", label: "Saved" },
  { key: "cities", label: "Cities" },
  { key: "countries", label: "Countries" },
  { key: "points", label: "Points" },
];

export function MyMapChrome() {
  const { user } = useAuth();
  const { data: pins, isLoading } = useLibraryEntries(user?.id);

  // While loading, render nothing — a skeleton band over a map reads as
  // chrome jank, and the map itself is already the loading surface.
  if (!user || isLoading || !pins) return null;

  if (pins.length === 0) {
    // First run: no all-zeros band above the invitation — that reads as failure.
    return (
      <div className="absolute top-1/2 left-1/2 z-[60] w-full max-w-xs -translate-x-1/2 -translate-y-1/2 border border-border-default bg-surface-card">
        <EmptyState
          className="px-6 py-8"
          eyebrow="Start your map"
          message="Save buildings you want to visit and log the ones you've seen — they'll plot here."
          action={
            <Link to="/explore" className="cta-link">
              Explore buildings
            </Link>
          }
        />
      </div>
    );
  }

  const stats = computeLibraryStats(pins);

  return (
    <div className="absolute inset-x-0 z-30 top-[calc(3.75rem+env(safe-area-inset-top,0px))] md:top-0">
      <div className="grid grid-cols-5 gap-px border-y border-border-default bg-border-default">
        {CELLS.map(({ key, label }) => (
          <div
            key={key}
            className="bg-surface-card/95 px-2 py-2 backdrop-blur-sm supports-backdrop-filter:bg-surface-card/90 md:px-4 md:py-2.5"
          >
            <div className="meta-code text-sm text-text-primary md:text-lg">
              {stats[key].toLocaleString()}
            </div>
            <div className="eyebrow mt-0.5 text-[9px] text-text-secondary md:text-[10px]">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
