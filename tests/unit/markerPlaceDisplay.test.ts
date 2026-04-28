import { describe, it, expect } from "vitest";
import { Croissant, Utensils } from "lucide-react";
import {
  getCollectionMarkerLucideIcon,
  mapGoogleTypesToCollectionCategory,
  pickGooglePrimaryTypeForStorage,
} from "@/features/collections/markerPlaceDisplay";

describe("pickGooglePrimaryTypeForStorage", () => {
  it("skips generic primary types and uses a concrete type from the list", () => {
    expect(pickGooglePrimaryTypeForStorage("establishment", ["establishment", "bakery"])).toBe("bakery");
  });

  it("returns primary type when it is concrete", () => {
    expect(pickGooglePrimaryTypeForStorage("bakery", ["establishment", "bakery"])).toBe("bakery");
  });
});

describe("mapGoogleTypesToCollectionCategory", () => {
  it("classifies cuisine-specific restaurant types as dining", () => {
    expect(mapGoogleTypesToCollectionCategory(["japanese_restaurant"])).toBe("dining");
  });
});

describe("getCollectionMarkerLucideIcon", () => {
  it("uses distinct icons for bakery vs restaurant when primary type is set", () => {
    const bakery = getCollectionMarkerLucideIcon("dining", "bakery");
    const restaurant = getCollectionMarkerLucideIcon("dining", "restaurant");
    expect(bakery).toBe(Croissant);
    expect(restaurant).toBe(Utensils);
  });

  it("falls back to category icon when primary type is missing", () => {
    const dining = getCollectionMarkerLucideIcon("dining", null);
    expect(dining).toBe(Utensils);
  });
});
