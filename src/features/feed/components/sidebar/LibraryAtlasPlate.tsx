import { useMemo } from "react";

import { buildAtlas, type AtlasPin } from "../../utils/libraryAtlas";

/**
 * The member's library as an ink-density plate: their buildings binned into a
 * grid, framed on their own geography, darkest where they've collected most.
 *
 * Deliberately not a map. A basemap would drag MapLibre onto the feed — the
 * app's most-visited route, which the bundler keeps map-free — and the rail's
 * grammar is squares and mono figures anyway. The city rows beneath the plate
 * carry the naming; this carries the shape.
 */

/** One cell is 10 user units, so the viewBox is cols × rows at 4:3. */
const UNIT = 10;
const CELL_INSET = 0.3;

/** Floor of the ink ramp — a single building still has to be visible. */
const MIN_INK = 0.16;
/** Sub-linear so one busy home city doesn't wash everywhere else out to nothing. */
const INK_GAMMA = 0.45;

export function LibraryAtlasPlate({
  pins,
  topPlaceName,
}: {
  pins: AtlasPin[];
  topPlaceName?: string;
}) {
  const atlas = useMemo(() => buildAtlas(pins), [pins]);
  const width = atlas.cols * UNIT;
  const height = atlas.rows * UNIT;

  const label = [
    `Density map of ${pins.length} ${pins.length === 1 ? "building" : "buildings"} in your library`,
    topPlaceName ? `, concentrated around ${topPlaceName}` : "",
    ".",
  ].join("");

  return (
    <div>
      <div className="aspect-4/3 w-full border border-border-default bg-surface-muted text-text-primary">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          role="img"
          aria-label={label}
        >
          {atlas.cells.map((cell) => (
            <rect
              key={`${cell.x}:${cell.y}`}
              x={cell.x * UNIT + CELL_INSET}
              y={cell.y * UNIT + CELL_INSET}
              width={UNIT - CELL_INSET * 2}
              height={UNIT - CELL_INSET * 2}
              fill="currentColor"
              fillOpacity={
                MIN_INK + (1 - MIN_INK) * (cell.weight / atlas.maxWeight) ** INK_GAMMA
              }
            />
          ))}
        </svg>
      </div>

      {/*
        The scale sits below the plate, not on it: over a dense city the ink
        goes near-black and a marker inside would be unreadable. As a sibling
        of the plate the bar is also exactly as wide as its fraction claims.
      */}
      {atlas.scaleFraction > 0 && (
        <div className="mt-1.5 flex items-center gap-2 text-text-disabled">
          <span
            className="h-px shrink-0 bg-current"
            style={{ width: `${atlas.scaleFraction * 100}%` }}
            aria-hidden
          />
          <span className="font-mono text-[10px] tracking-[0.08em]">{atlas.scaleLabel}</span>
        </div>
      )}
    </div>
  );
}
