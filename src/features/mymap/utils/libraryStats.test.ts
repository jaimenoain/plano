import { describe, it, expect } from "vitest";
import type { LibraryPin } from "@/features/feed/api/railApi";
import { computeLibraryStats } from "./libraryStats";

const pin = (overrides: Partial<LibraryPin> = {}): LibraryPin => ({
  lat: null,
  lng: null,
  city: "Madrid",
  country: "Spain",
  status: "visited",
  rating: null,
  ...overrides,
});

describe("computeLibraryStats", () => {
  it("returns all zeros for an empty library", () => {
    expect(computeLibraryStats([])).toEqual({
      visited: 0,
      saved: 0,
      cities: 0,
      countries: 0,
      points: 0,
    });
  });

  it("splits visited and saved (pending) and sums the award points", () => {
    const stats = computeLibraryStats([
      pin({ status: "visited", rating: 3 }),
      pin({ status: "visited", rating: 0 }),
      pin({ status: "visited", rating: null }),
      pin({ status: "pending", rating: null }),
      pin({ status: "pending", rating: 2 }),
    ]);
    expect(stats.visited).toBe(3);
    expect(stats.saved).toBe(2);
    expect(stats.points).toBe(5);
  });

  it("counts distinct places and countries, trimmed and case-insensitively", () => {
    const stats = computeLibraryStats([
      pin({ city: "Madrid", country: "Spain" }),
      pin({ city: "madrid ", country: " spain" }),
      pin({ city: "Barcelona", country: "SPAIN" }),
      pin({ city: "Tokyo", country: "Japan" }),
    ]);
    expect(stats.cities).toBe(3);
    expect(stats.countries).toBe(2);
  });

  it("falls back to the country as the place for buildings filed without a city, and skips blanks", () => {
    const stats = computeLibraryStats([
      pin({ city: null, country: "Portugal" }),
      pin({ city: null, country: null }),
      pin({ city: "", country: "  " }),
    ]);
    expect(stats.cities).toBe(1);
    expect(stats.countries).toBe(1);
  });
});
