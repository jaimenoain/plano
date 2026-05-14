import { describe, it, expect } from "vitest";
import { buildSpotlightAttribution } from "./getBuildingSpotlights";

describe("buildSpotlightAttribution", () => {
  it("direct ring with photos → 'N photo(s) from people you follow'", () => {
    expect(buildSpotlightAttribution("direct", 1, "Lisbon", "24h")).toBe(
      "1 photo from people you follow",
    );
    expect(buildSpotlightAttribution("direct", 5, "Porto", "7d")).toBe(
      "5 photos from people you follow",
    );
  });

  it("direct ring with 0 photos → generic activity text", () => {
    expect(buildSpotlightAttribution("direct", 0, "Berlin", "24h")).toBe(
      "Activity from people you follow",
    );
  });

  it("open ring with city + 24h window → 'Trending in {city} today'", () => {
    expect(buildSpotlightAttribution("open", 3, "Tokyo", "24h")).toBe(
      "Trending in Tokyo today",
    );
  });

  it("open ring with city + 7d window → 'Trending in {city} this week'", () => {
    expect(buildSpotlightAttribution("open", 3, "Paris", "7d")).toBe(
      "Trending in Paris this week",
    );
  });

  it("open ring without city → 'Trending today/this week'", () => {
    expect(buildSpotlightAttribution("open", 2, null, "24h")).toBe("Trending today");
    expect(buildSpotlightAttribution("open", 2, null, "30d")).toBe("Trending this week");
  });
});
