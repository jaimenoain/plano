import { describe, it, expect } from "vitest";

import {
  buildAtlas,
  isPlottable,
  rollUpPlaces,
  type Atlas,
  type AtlasPin,
} from "./libraryAtlas";

/** The cells buildings actually landed in, ignoring the bloom around them. */
const cores = (atlas: Atlas) => atlas.cells.filter((cell) => cell.count > 0);

const pin = (lat: number | null, lng: number | null, city: string | null = "Madrid"): AtlasPin => ({
  lat,
  lng,
  city,
  country: "Spain",
});

describe("isPlottable", () => {
  it("accepts real coordinates and rejects missing, out-of-range and null-island ones", () => {
    expect(isPlottable(pin(40.41, -3.7))).toBe(true);
    expect(isPlottable(pin(null, null))).toBe(false);
    expect(isPlottable(pin(40.41, null))).toBe(false);
    expect(isPlottable(pin(91, 0))).toBe(false);
    expect(isPlottable(pin(0, 181))).toBe(false);
    expect(isPlottable(pin(0, 0))).toBe(false);
    expect(isPlottable(pin(Number.NaN, 12))).toBe(false);
  });
});

describe("buildAtlas", () => {
  it("returns an empty atlas when nothing is plottable", () => {
    const atlas = buildAtlas([pin(null, null), pin(0, 0)]);
    expect(atlas.cells).toEqual([]);
    expect(atlas.maxCount).toBe(0);
    expect(atlas.scaleFraction).toBe(0);
  });

  it("plots a lone building as one core cell without producing NaN", () => {
    const atlas = buildAtlas([pin(40.4168, -3.7038)]);
    expect(cores(atlas)).toHaveLength(1);
    expect(atlas.maxCount).toBe(1);

    const [cell] = cores(atlas);
    expect(Number.isFinite(cell.x)).toBe(true);
    expect(Number.isFinite(cell.y)).toBe(true);
    expect(cell.x).toBeGreaterThanOrEqual(0);
    expect(cell.x).toBeLessThan(atlas.cols);
    expect(cell.y).toBeGreaterThanOrEqual(0);
    expect(cell.y).toBeLessThan(atlas.rows);
  });

  it("blooms each building into the cells around it so a city isn't a lone square", () => {
    const atlas = buildAtlas([pin(40.4168, -3.7038)]);

    // One core plus its eight neighbours, and the core is the darkest.
    expect(atlas.cells).toHaveLength(9);
    expect(atlas.maxWeight).toBe(1);

    const [core] = cores(atlas);
    for (const cell of atlas.cells) {
      expect(cell.weight).toBeGreaterThan(0);
      if (cell !== core) expect(cell.weight).toBeLessThan(core.weight);
    }
  });

  it("accumulates repeat coordinates into one cell and tracks the busiest", () => {
    const atlas = buildAtlas([
      pin(40.4168, -3.7038),
      pin(40.4168, -3.7038),
      pin(40.4168, -3.7038),
      pin(41.3874, 2.1686),
    ]);

    const counts = cores(atlas)
      .map((cell) => cell.count)
      .sort((a, b) => b - a);
    expect(counts).toEqual([3, 1]);
    expect(atlas.maxCount).toBe(3);
    expect(atlas.maxWeight).toBe(3);
  });

  it("separates distant buildings into different cells", () => {
    const atlas = buildAtlas([pin(40.4168, -3.7038), pin(35.6762, 139.6503, "Tokyo")]);
    const [madrid, tokyo] = cores(atlas);
    expect(cores(atlas)).toHaveLength(2);
    expect(madrid.x).not.toBe(tokyo.x);
  });

  it("keeps every pin inside the grid", () => {
    const atlas = buildAtlas([
      pin(-33.8688, 151.2093, "Sydney"),
      pin(64.1466, -21.9426, "Reykjavik"),
      pin(-22.9068, -43.1729, "Rio"),
      pin(55.7558, 37.6173, "Moscow"),
    ]);

    expect(cores(atlas)).toHaveLength(4);
    for (const cell of atlas.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(atlas.cols);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThan(atlas.rows);
    }
  });

  it("corrects for longitude convergence so a high-latitude pair isn't stretched", () => {
    // Two pairs one degree of latitude apart, and one degree of longitude
    // apart. Near the equator that is a near-square; at 70°N the longitude
    // leg is roughly a third as long on the ground, so it must span fewer
    // columns than the equatorial pair does.
    const equator = buildAtlas([pin(0.5, 10), pin(1.5, 11)]);
    const arctic = buildAtlas([pin(69.5, 10), pin(70.5, 11)]);

    const spread = (atlas: Atlas) => Math.abs(cores(atlas)[0].x - cores(atlas)[1].x);

    expect(spread(arctic)).toBeLessThan(spread(equator));
  });

  it("labels the scale bar with a round distance that fits the plate", () => {
    const atlas = buildAtlas([pin(40.0, -4.0), pin(41.0, -3.0)]);

    expect(atlas.scaleLabel).toMatch(/^(1|2|5|10|20|50|100|200|500|1000|2000|5000) KM$/);
    expect(atlas.scaleFraction).toBeGreaterThan(0);
    expect(atlas.scaleFraction).toBeLessThanOrEqual(0.6);
  });

  it("honours a custom grid size", () => {
    const atlas = buildAtlas([pin(40.4168, -3.7038)], { cols: 4, rows: 4 });
    expect(atlas.cols).toBe(4);
    expect(atlas.rows).toBe(4);
    expect(cores(atlas)[0].x).toBeLessThan(4);
  });
});

describe("rollUpPlaces", () => {
  it("ranks cities by count and reports how many were left over", () => {
    const { places, placeCount } = rollUpPlaces([
      pin(40, -3, "Madrid"),
      pin(40, -3, "Madrid"),
      pin(41, 2, "Barcelona"),
      pin(51, 0, "London"),
      pin(48, 2, "Paris"),
    ]);

    expect(places).toEqual([
      { name: "Madrid", count: 2 },
      { name: "Barcelona", count: 1 },
      { name: "London", count: 1 },
    ]);
    expect(placeCount).toBe(4);
  });

  it("counts buildings with no coordinates — a city is a city either way", () => {
    const { places } = rollUpPlaces([pin(null, null, "Madrid"), pin(40, -3, "Madrid")]);
    expect(places).toEqual([{ name: "Madrid", count: 2 }]);
  });

  it("merges casing variants and falls back to country when the city is missing", () => {
    const { places, placeCount } = rollUpPlaces([
      pin(40, -3, "Madrid"),
      pin(40, -3, "MADRID"),
      pin(40, -3, null),
      pin(40, -3, "   "),
    ]);

    expect(placeCount).toBe(2);
    expect(places[0]).toEqual({ name: "Madrid", count: 2 });
    expect(places[1]).toEqual({ name: "Spain", count: 2 });
  });
});
