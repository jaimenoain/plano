import { Link } from "react-router";

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

import { useMyMapSummary } from "../../hooks/useMyMapSummary";
import { WorldHeatPlate } from "./WorldHeatPlate";

/**
 * "My Map" — the member's personal map (`/map`) previewed as a world heat
 * map: where they've actually been collecting, plus the cities they've
 * collected most. Fed by a pre-aggregated RPC (`get_my_map_summary`) rather
 * than the raw library, so a 13,000-building collector costs the feed the
 * same handful of rows as someone with three. Auth-gated like the
 * destination, so it renders only for signed-in members.
 */
export function MyMapModule({ userId }: { userId?: string }) {
  const { data, isLoading } = useMyMapSummary(userId);

  if (!userId) return null;

  const libraryCount = data?.libraryCount ?? 0;
  const cities = data?.cities ?? [];
  const cells = data?.cells ?? [];
  const remainingPlaces = (data?.placeCount ?? 0) - cities.length;

  return (
    <RailModule>
      <RailHeader label="My Map" meta={libraryCount > 0 ? String(libraryCount) : undefined} />

      {isLoading ? (
        <>
          <div className="aspect-2/1 w-full animate-pulse bg-surface-muted" />
          <div className="mt-4">
            <RailSkeletonRows rows={3} />
          </div>
        </>
      ) : libraryCount === 0 ? (
        <EmptyState
          className="items-start gap-2 px-0 py-2 text-left"
          eyebrow="Your map is empty"
          message="Save or log buildings and they'll map out here."
          action={
            <Link to="/explore" className="cta-link">
              Explore buildings
            </Link>
          }
        />
      ) : (
        <>
          {cells.length > 0 && (
            <Link to="/map" className="block transition-opacity hover:opacity-80">
              <WorldHeatPlate cells={cells} topPlaceName={cities[0]?.name} pinCount={libraryCount} />
            </Link>
          )}

          {cities.length > 0 && (
            <ul className={cn(cells.length > 0 && "mt-4")}>
              {cities.map((place) => (
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
            <Link to="/map" className="cta-link">
              Open My Map
            </Link>
          </div>
        </>
      )}
    </RailModule>
  );
}
