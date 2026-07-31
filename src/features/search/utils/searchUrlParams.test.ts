import { describe, it, expect } from "vitest";
import { companionFiltersForMode, modeSwitchUrl, parseModeParams } from "./searchUrlParams";

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

describe("modeSwitchUrl — leaving /map for another mode", () => {
  const params = new URLSearchParams(
    "lat=51.5&lng=-0.12&zoom=13&status=visited,saved,pending&rated_by=jaime&minRating=2&folders=f1&collections=c1&category=museum&view=list",
  );

  it("keeps the viewport and the global filters", () => {
    const url = new URL(`https://plano.app${modeSwitchUrl(params, "discover")}`);
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("mode")).toBe("discover");
    expect(url.searchParams.get("lat")).toBe("51.5");
    expect(url.searchParams.get("lng")).toBe("-0.12");
    expect(url.searchParams.get("zoom")).toBe("13");
    expect(url.searchParams.get("category")).toBe("museum");
    expect(url.searchParams.get("view")).toBe("list");
  });

  it("drops the library-only filters — Discover would otherwise keep showing only your pins", () => {
    const url = new URL(`https://plano.app${modeSwitchUrl(params, "discover")}`);
    expect(url.searchParams.get("status")).toBeNull();
    expect(url.searchParams.get("rated_by")).toBeNull();
    expect(url.searchParams.get("minRating")).toBeNull();
    expect(url.searchParams.get("folders")).toBeNull();
    expect(url.searchParams.get("collections")).toBeNull();
  });

  it("writes no mode for All (null)", () => {
    const url = new URL(`https://plano.app${modeSwitchUrl(params, null)}`);
    expect(url.searchParams.get("mode")).toBeNull();
    expect(url.searchParams.get("lat")).toBe("51.5");
  });

  it("returns a bare /search when there is nothing to carry", () => {
    expect(modeSwitchUrl(new URLSearchParams(), null)).toBe("/search");
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

describe("parseModeParams with a forced-mode shim (the /map route)", () => {
  const shim =
    (params: Record<string, string>) =>
    (key: string): string | null =>
      key === "mode" ? "library" : (params[key] ?? null);

  it("seeds library mode and its companion status baseline from the shim alone", () => {
    const parsed = parseModeParams(shim({}));
    expect(parsed.mode).toBe("library");
    expect(parsed.statusFilters).toEqual(["visited", "saved", "pending"]);
    expect(parsed.hideVisited).toBe(false);
    expect(parsed.hideSaved).toBe(false);
  });

  it("lets an explicit ?status= deep link narrow the baseline", () => {
    const parsed = parseModeParams(shim({ status: "visited" }));
    expect(parsed.mode).toBe("library");
    expect(parsed.statusFilters).toEqual(["visited"]);
  });
});
