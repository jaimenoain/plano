import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import {
  RAIL_LIST_ITEM,
  RAIL_ROW,
  RAIL_ROW_FIGURE,
  RAIL_ROW_TITLE,
  RailHeader,
  RailModule,
  RailSkeletonRows,
} from "@/components/ui/rail";

import { fetchLibraryPins } from "../../api/railApi";
import { isPlottable, rollUpPlaces } from "../../utils/libraryAtlas";
import { LibraryAtlasPlate } from "./LibraryAtlasPlate";

/**
 * "My Library" — the member's personal map (`/search?mode=library`) previewed
 * as a density plate: where they've actually been collecting, plus the cities
 * they've collected most. Auth-gated like the destination, so it renders only
 * for signed-in members.
 */
export function MyLibraryModule({ userId }: { userId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["feed-sidebar", "library-atlas", userId],
    queryFn: () => fetchLibraryPins(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const pins = useMemo(() => data ?? [], [data]);
  const plottable = useMemo(() => pins.filter(isPlottable), [pins]);
  const { places, placeCount } = useMemo(() => rollUpPlaces(pins), [pins]);

  if (!userId) return null;

  const remainingPlaces = placeCount - places.length;

  return (
    <RailModule>
      <RailHeader label="My Library" meta={pins.length > 0 ? String(pins.length) : undefined} />

      {isLoading ? (
        <>
          <div className="aspect-4/3 w-full animate-pulse bg-surface-muted" />
          <div className="mt-4">
            <RailSkeletonRows rows={3} />
          </div>
        </>
      ) : pins.length === 0 ? (
        <EmptyState
          className="items-start gap-2 px-0 py-2 text-left"
          eyebrow="Your library is empty"
          message="Save or log buildings and they'll map out here."
          action={
            <Link to="/explore" className="cta-link">
              Explore buildings
            </Link>
          }
        />
      ) : (
        <>
          {plottable.length > 0 && (
            <Link to="/search?mode=library" className="block transition-opacity hover:opacity-80">
              <LibraryAtlasPlate pins={plottable} topPlaceName={places[0]?.name} />
            </Link>
          )}

          {places.length > 0 && (
            <ul className={cn(plottable.length > 0 && "mt-4")}>
              {places.map((place) => (
                <li key={place.name} className={RAIL_LIST_ITEM}>
                  <div className={RAIL_ROW}>
                    <span className={cn(RAIL_ROW_TITLE, "flex-1 uppercase tracking-[0.04em]")}>
                      {place.name}
                    </span>
                    <span className={RAIL_ROW_FIGURE}>{place.count}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {remainingPlaces > 0 && (
            <p className="mt-2.5 text-[11px] text-text-disabled">
              {`+ ${remainingPlaces} more ${remainingPlaces === 1 ? "city" : "cities"}`}
            </p>
          )}

          <div className="mt-4">
            <Link to="/search?mode=library" className="cta-link">
              Open My Library
            </Link>
          </div>
        </>
      )}
    </RailModule>
  );
}
