import { describe, it, expect } from "vitest";
import { companionFiltersForMode, parseModeParams } from "./searchUrlParams";

describe("companionFiltersForMode", () => {
  it("gives My map the member's own statuses and keeps its personal filters", () => {
    expect(companionFiltersForMode("library")).toEqual({
      statusFilters: ["visited", "saved", "pending"],
      hideVisited: false,
      hideSaved: false,
      keepsPersonalFilters: true,
    });
  });

  it("hides what you already have in Discover, and drops the personal filters", () => {
    expect(companionFiltersForMode("discover")).toEqual({
      statusFilters: [],
      hideVisited: true,
      hideSaved: true,
      keepsPersonalFilters: false,
    });
  });

  it("leaves All unfiltered, and drops the personal filters", () => {
    expect(companionFiltersForMode(null)).toEqual({
      statusFilters: [],
      hideVisited: false,
      hideSaved: false,
      keepsPersonalFilters: false,
    });
  });
});

describe("parseModeParams", () => {
  const from = (qs: string) => (key: string) => new URLSearchParams(qs).get(key);

  it("gives ?mode=library the personal-status baseline on /search too", () => {
    const parsed = parseModeParams(from("mode=library"));
    expect(parsed.mode).toBe("library");
    expect(parsed.statusFilters).toEqual(["visited", "saved", "pending"]);
    expect(parsed.hideVisited).toBe(false);
    expect(parsed.hideSaved).toBe(false);
  });
});
