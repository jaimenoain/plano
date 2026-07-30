import { describe, it, expect } from "vitest";
import { libraryModeRedirectUrl, parseModeParams } from "./searchUrlParams";

describe("libraryModeRedirectUrl", () => {
  it("sends ?mode=library to /map", () => {
    expect(libraryModeRedirectUrl("https://plano.app/search?mode=library")).toBe("/map");
  });

  it("preserves every other param — viewport, filters, view", () => {
    const to = libraryModeRedirectUrl(
      "https://plano.app/search?lat=51.5&lng=-0.12&zoom=13&mode=library&status=visited&minRating=2&view=list",
    );
    expect(to).not.toBeNull();
    const url = new URL(`https://plano.app${to}`);
    expect(url.pathname).toBe("/map");
    expect(url.searchParams.get("mode")).toBeNull();
    expect(url.searchParams.get("lat")).toBe("51.5");
    expect(url.searchParams.get("lng")).toBe("-0.12");
    expect(url.searchParams.get("zoom")).toBe("13");
    expect(url.searchParams.get("status")).toBe("visited");
    expect(url.searchParams.get("minRating")).toBe("2");
    expect(url.searchParams.get("view")).toBe("list");
  });

  it("leaves discover and mode-less URLs alone", () => {
    expect(libraryModeRedirectUrl("https://plano.app/search?mode=discover")).toBeNull();
    expect(libraryModeRedirectUrl("https://plano.app/search?lat=1&lng=2")).toBeNull();
    expect(libraryModeRedirectUrl("https://plano.app/search")).toBeNull();
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
