/**
 * Geometry for the feed rail's "My Map" density plate.
 *
 * Pure functions — no React, no data access — so the projection, the binning
 * and the scale bar are testable without rendering anything. The plate is a
 * heatmap, not a map: there is no basemap, so the framing has to come from the
 * member's own buildings.
 */

/**
 * Structurally the rail API's `LibraryPin`, declared here so the geometry
 * stays dependency-free.
 */
export type AtlasPin = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
};

/** A pin that survived validation — safe to project. */
export type PlottablePin = AtlasPin & { lat: number; lng: number };

export type AtlasCell = {
  x: number;
  y: number;
  /** Buildings that actually land in this cell. */
  count: number;
  /** Smoothed density including bloom from neighbours — what the ink follows. */
  weight: number;
};

export type Atlas = {
  cells: AtlasCell[];
  cols: number;
  rows: number;
  /** The busiest cell — the top of the ink ramp. */
  maxCount: number;
  maxWeight: number;
  /** e.g. `"200 KM"`, sized to the bar beside it. */
  scaleLabel: string;
  /** Bar width as a fraction of the plate's width, 0–1. */
  scaleFraction: number;
};

const DEFAULT_COLS = 16;
const DEFAULT_ROWS = 12;

/** Close enough for a 320px plate. */
const KM_PER_DEGREE = 111.32;

/** ~2km. Floors the frame so a single-building library doesn't divide by zero. */
const MIN_SPAN_DEG = 0.018;

/**
 * Breathing room around the bounding box, per side. Wide enough that the
 * bloom around an outermost building still lands inside the plate.
 */
const PADDING = 0.14;

const NICE_DISTANCES_KM = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

/** How many cells wide the scale bar aims to be. */
const SCALE_TARGET_CELLS = 3;

/**
 * Each building deposits into its own cell and bleeds into the eight around
 * it. A city is tiny next to the frame that holds it, so without this every
 * place collapses to a lone square and the plate reads as confetti rather
 * than a heat field. `[dx, dy, weight]`.
 */
const KERNEL: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 1],
  [1, 0, 0.45],
  [-1, 0, 0.45],
  [0, 1, 0.45],
  [0, -1, 0.45],
  [1, 1, 0.2],
  [1, -1, 0.2],
  [-1, 1, 0.2],
  [-1, -1, 0.2],
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Coordinates we can honestly draw. Rejects the null island (0,0) — the
 * catalogue's stand-in for "we don't know where this is", which would
 * otherwise drag every frame out to the Gulf of Guinea.
 */
export function isPlottable(pin: AtlasPin): pin is PlottablePin {
  return (
    pin.lat !== null &&
    pin.lng !== null &&
    Number.isFinite(pin.lat) &&
    Number.isFinite(pin.lng) &&
    Math.abs(pin.lat) <= 90 &&
    Math.abs(pin.lng) <= 180 &&
    !(pin.lat === 0 && pin.lng === 0)
  );
}

const EMPTY_ATLAS: Atlas = {
  cells: [],
  cols: DEFAULT_COLS,
  rows: DEFAULT_ROWS,
  maxCount: 0,
  maxWeight: 0,
  scaleLabel: "",
  scaleFraction: 0,
};

/**
 * Bin pins into a grid of ink cells, framed on their own bounding box.
 *
 * Longitude degrees shrink toward the poles, so the projection scales x by
 * cos(mid-latitude) — without it a Helsinki library renders stretched
 * sideways. Both axes then share one square cell size, so a cell means the
 * same distance across as it does down.
 */
export function buildAtlas(
  pins: AtlasPin[],
  options: { cols?: number; rows?: number } = {},
): Atlas {
  const cols = options.cols ?? DEFAULT_COLS;
  const rows = options.rows ?? DEFAULT_ROWS;
  const plottable = pins.filter(isPlottable);

  if (plottable.length === 0) return { ...EMPTY_ATLAS, cols, rows };

  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const pin of plottable) {
    if (pin.lat < minLat) minLat = pin.lat;
    if (pin.lat > maxLat) maxLat = pin.lat;
  }

  const midLat = (minLat + maxLat) / 2;
  const lngScale = Math.max(Math.cos((midLat * Math.PI) / 180), 0.05);

  // Flat space: one unit ≈ one degree of latitude on both axes.
  const projectX = (lng: number) => lng * lngScale;
  const projectY = (lat: number) => -lat;

  let minX = Infinity;
  let maxX = -Infinity;
  for (const pin of plottable) {
    const x = projectX(pin.lng);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (projectY(maxLat) + projectY(minLat)) / 2;
  const spanX = Math.max((maxX - minX) * (1 + PADDING * 2), MIN_SPAN_DEG);
  const spanY = Math.max((maxLat - minLat) * (1 + PADDING * 2), MIN_SPAN_DEG);

  const cell = Math.max(spanX / cols, spanY / rows);
  const originX = centerX - (cell * cols) / 2;
  const originY = centerY - (cell * rows) / 2;

  const cells = new Map<string, AtlasCell>();
  for (const pin of plottable) {
    const cx = clamp(Math.floor((projectX(pin.lng) - originX) / cell), 0, cols - 1);
    const cy = clamp(Math.floor((projectY(pin.lat) - originY) / cell), 0, rows - 1);

    for (const [dx, dy, weight] of KERNEL) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

      const isCore = dx === 0 && dy === 0;
      const key = `${x}:${y}`;
      const existing = cells.get(key);
      if (existing) {
        existing.weight += weight;
        if (isCore) existing.count += 1;
      } else {
        cells.set(key, { x, y, count: isCore ? 1 : 0, weight });
      }
    }
  }

  let maxCount = 0;
  let maxWeight = 0;
  for (const entry of cells.values()) {
    if (entry.count > maxCount) maxCount = entry.count;
    if (entry.weight > maxWeight) maxWeight = entry.weight;
  }

  return {
    cells: Array.from(cells.values()),
    cols,
    rows,
    maxCount,
    maxWeight,
    ...buildScale(cell, cols),
  };
}

/** A round distance near three cells wide, and how much of the plate it spans. */
function buildScale(cellDeg: number, cols: number) {
  const cellKm = cellDeg * KM_PER_DEGREE;
  const target = cellKm * SCALE_TARGET_CELLS;
  const distance = NICE_DISTANCES_KM.reduce((best, candidate) =>
    Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best,
  );

  return {
    scaleLabel: `${distance} KM`,
    scaleFraction: clamp(distance / (cellKm * cols), 0.08, 0.6),
  };
}

export type AtlasPlace = { name: string; count: number };

/**
 * The library's busiest places, by city — the text that gives the plate its
 * meaning. Falls back to country for buildings filed without a city, and
 * counts every pin, mappable or not: a building with no coordinates still
 * belongs to a city.
 */
export function rollUpPlaces(
  pins: AtlasPin[],
  limit = 3,
): { places: AtlasPlace[]; placeCount: number } {
  const byKey = new Map<string, AtlasPlace>();

  for (const pin of pins) {
    const city = pin.city?.trim();
    const name = city || (pin.country?.trim() ?? "");
    if (!name) continue;
    const existing = byKey.get(name.toLowerCase());
    if (existing) existing.count += 1;
    else byKey.set(name.toLowerCase(), { name, count: 1 });
  }

  const ranked = Array.from(byKey.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );

  return { places: ranked.slice(0, limit), placeCount: ranked.length };
}
