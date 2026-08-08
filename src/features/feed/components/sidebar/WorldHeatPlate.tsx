import { useMemo } from "react";

import {
  CONTINENT_LABELS,
  WORLD_LAND_PATH,
  WORLD_VIEW_HEIGHT,
  WORLD_VIEW_WIDTH,
  projectLngLat,
} from "../../data/worldLand";
import type { MapSummaryCell } from "../../api/railApi";

/**
 * The member's library as a heat of soft glows over a real world silhouette —
 * replaces the old abstract "ink density plate" (LibraryAtlasPlate), which
 * read as pixel noise because it carried no geography of its own.
 *
 * Fed by `get_my_map_summary`'s pre-aggregated 5°x5° cells, not the raw
 * library: a few dozen rows regardless of whether the member has 3 buildings
 * or 13,000, so this widget never scales with library size.
 *
 * World outline is committed static path data (src/features/feed/data/
 * worldLand.ts) — no MapLibre or projection library on the feed bundle.
 */

/** Blob radius floor/ceiling in the 720x360 viewBox — always visible, never swallows a continent. */
const MIN_RADIUS = 5;
const MAX_RADIUS = 22;
/** Sub-linear so one busy home city doesn't wash every other region out to nothing. */
const RADIUS_GAMMA = 0.45;
const MIN_OPACITY = 0.35;

export function WorldHeatPlate({
  cells,
  topPlaceName,
  pinCount,
}: {
  cells: MapSummaryCell[];
  topPlaceName?: string;
  pinCount: number;
}) {
  const maxWeight = useMemo(
    () => cells.reduce((max, cell) => Math.max(max, cell.weight), 0),
    [cells],
  );

  const label = [
    `World map of ${pinCount} ${pinCount === 1 ? "building" : "buildings"} in your library`,
    topPlaceName ? `, concentrated around ${topPlaceName}` : "",
    ".",
  ].join("");

  const viewHeight = WORLD_VIEW_HEIGHT / 2;
  const viewYOffset = WORLD_VIEW_HEIGHT / 4;

  return (
    <div className="aspect-2/1 w-full border border-border-default bg-surface-muted text-text-primary">
      <svg
        viewBox={`0 ${viewYOffset} ${WORLD_VIEW_WIDTH} ${viewHeight}`}
        className="h-full w-full"
        role="img"
        aria-label={label}
      >
        <defs>
          <filter id="my-map-heat-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <path d={WORLD_LAND_PATH} className="fill-border-default" />

        {CONTINENT_LABELS.map((continent) => (
          <text
            key={continent.name}
            x={continent.x}
            y={continent.y}
            textAnchor="middle"
            className="fill-text-disabled font-mono"
            style={{ fontSize: 6, letterSpacing: "0.06em" }}
          >
            {continent.name}
          </text>
        ))}

        <g filter="url(#my-map-heat-blur)">
          {cells.map((cell) => {
            const { x, y } = projectLngLat(cell.lng, cell.lat);
            const ratio = maxWeight > 0 ? cell.weight / maxWeight : 0;
            const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * ratio ** RADIUS_GAMMA;
            const opacity = MIN_OPACITY + (1 - MIN_OPACITY) * ratio ** RADIUS_GAMMA;

            return (
              <circle
                key={`${cell.lat}:${cell.lng}`}
                cx={x}
                cy={y}
                r={radius}
                fill="currentColor"
                fillOpacity={opacity}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
