import { describe, it, expect } from "vitest";
import { Bus, Croissant, GraduationCap, MapPin, Navigation, Plane, TrainFront, Utensils } from "lucide-react";
import {
  getCollectionMarkerLucideIcon,
  mapGoogleTypesToCollectionCategory,
  pickGooglePrimaryTypeForStorage,
  resolveCollectionMarkerIcon,
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

  it("keeps the plain pin fallback for text surfaces", () => {
    expect(getCollectionMarkerLucideIcon("other", null)).toBe(MapPin);
  });
});

describe("resolveCollectionMarkerIcon", () => {
  it("resolves the primary type and the category the same way", () => {
    expect(resolveCollectionMarkerIcon("dining", "bakery")).toBe(Croissant);
    expect(resolveCollectionMarkerIcon("dining", null)).toBe(Utensils);
  });

  // Map pins draw the glyph inside a teardrop shell, so "we cannot classify this"
  // has to be expressible as null — a pin glyph there is a pin inside a pin.
  it("returns null for an unclassified place", () => {
    expect(resolveCollectionMarkerIcon("other", null)).toBeNull();
    expect(resolveCollectionMarkerIcon("other", "establishment")).toBeNull();
  });

  it("gives transport types their own apt icon, not a generic bus", () => {
    expect(resolveCollectionMarkerIcon("transport", "airport")).toBe(Plane);
    expect(resolveCollectionMarkerIcon("transport", "train_station")).toBe(TrainFront);
    expect(resolveCollectionMarkerIcon("transport", "bus_station")).toBe(Bus);
  });

  it("falls back to a neutral wayfinding icon for an unrecognized transport type, never Bus", () => {
    expect(resolveCollectionMarkerIcon("transport", null)).toBe(Navigation);
    expect(resolveCollectionMarkerIcon("transport", "some_new_google_type")).toBe(Navigation);
  });

  it("resolves common non-food, non-transport place types to an apt icon", () => {
    expect(resolveCollectionMarkerIcon("attraction", "museum")).not.toBeNull();
    expect(resolveCollectionMarkerIcon("attraction", "movie_theater")).not.toBeNull();
    expect(resolveCollectionMarkerIcon("other", "university")).toBe(GraduationCap);
    expect(resolveCollectionMarkerIcon("other", "bank")).not.toBeNull();
  });
});

describe("mapGoogleTypesToCollectionCategory — expanded coverage", () => {
  it("classifies a movie theater and a place of worship as attraction", () => {
    expect(mapGoogleTypesToCollectionCategory(["movie_theater"])).toBe("attraction");
    expect(mapGoogleTypesToCollectionCategory(["place_of_worship"])).toBe("attraction");
  });
});
