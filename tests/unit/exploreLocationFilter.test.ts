import { describe, expect, it } from "vitest";
import {
  extractGeocodeViewportBounds,
  isExploreViewportWithinRpcLimits,
} from "@/features/explore/exploreLocationFilter";

describe("isExploreViewportWithinRpcLimits", () => {
  it("accepts a typical city-scale box", () => {
    expect(
      isExploreViewportWithinRpcLimits({
        minLat: 51.4,
        maxLat: 51.6,
        minLng: -0.2,
        maxLng: 0.05,
      })
    ).toBe(true);
  });

  it("rejects boxes larger than 25 degrees on either axis", () => {
    expect(
      isExploreViewportWithinRpcLimits({
        minLat: 20,
        maxLat: 50,
        minLng: -10,
        maxLng: 10,
      })
    ).toBe(false);
  });

  it("rejects degenerate boxes", () => {
    expect(
      isExploreViewportWithinRpcLimits({
        minLat: 1,
        maxLat: 1,
        minLng: 1,
        maxLng: 2,
      })
    ).toBe(false);
  });

  it("rejects inverted latitude", () => {
    expect(
      isExploreViewportWithinRpcLimits({
        minLat: 10,
        maxLat: 5,
        minLng: 1,
        maxLng: 2,
      })
    ).toBe(false);
  });
});

describe("extractGeocodeViewportBounds", () => {
  it("normalizes NE/SW order into min/max", () => {
    const details = {
      geometry: {
        viewport: {
          getNorthEast: () => ({ lat: () => 10, lng: () => 5 }),
          getSouthWest: () => ({ lat: () => 8, lng: () => 1 }),
        },
      },
    } as unknown as google.maps.GeocoderResult;
    expect(extractGeocodeViewportBounds(details)).toEqual({
      minLat: 8,
      maxLat: 10,
      minLng: 1,
      maxLng: 5,
    });
  });

  it("returns null without viewport", () => {
    const details = { geometry: {} } as unknown as google.maps.GeocoderResult;
    expect(extractGeocodeViewportBounds(details)).toBeNull();
  });
});
