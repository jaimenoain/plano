import { describe, it, expect } from "vitest";

import {
  CONTINENT_LABELS,
  WORLD_LAND_PATH,
  WORLD_VIEW_HEIGHT,
  WORLD_VIEW_WIDTH,
  projectLngLat,
} from "./worldLand";

describe("projectLngLat", () => {
  it("maps the origin to the centre of the viewBox", () => {
    expect(projectLngLat(0, 0)).toEqual({
      x: WORLD_VIEW_WIDTH / 2,
      y: WORLD_VIEW_HEIGHT / 2,
    });
  });

  it("maps the corners of the lat/lng frame to the corners of the viewBox", () => {
    expect(projectLngLat(-180, 90)).toEqual({ x: 0, y: 0 });
    expect(projectLngLat(180, -90)).toEqual({ x: WORLD_VIEW_WIDTH, y: WORLD_VIEW_HEIGHT });
  });
});

describe("committed world outline asset", () => {
  it("has non-empty path data and continent labels inside the viewBox", () => {
    expect(WORLD_LAND_PATH.length).toBeGreaterThan(1000);
    expect(WORLD_LAND_PATH.startsWith("M")).toBe(true);

    expect(CONTINENT_LABELS.length).toBeGreaterThan(0);
    for (const label of CONTINENT_LABELS) {
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.x).toBeLessThanOrEqual(WORLD_VIEW_WIDTH);
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeLessThanOrEqual(WORLD_VIEW_HEIGHT);
    }
  });
});
