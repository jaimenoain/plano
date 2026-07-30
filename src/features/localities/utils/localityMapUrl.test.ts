import { describe, it, expect } from "vitest";
import {
  buildLocalityMapUrl,
  deriveLocalityCenter,
  LOCALITY_MAP_ZOOM,
} from "./localityMapUrl";
import type { LocalityBuildingDTO } from "../types";

function point(lat: number, lng: number): Pick<LocalityBuildingDTO, "location_lat" | "location_lng"> {
  return { location_lat: lat, location_lng: lng };
}

describe("buildLocalityMapUrl", () => {
  it("points at the search map, centred on the locality's coordinate", () => {
    const href = buildLocalityMapUrl({ city: "London", lat: 51.515, lng: -0.1252 });

    const url = new URL(href, "https://plano.test");
    expect(url.pathname).toBe("/search");
    expect(url.searchParams.get("lat")).toBe("51.515");
    expect(url.searchParams.get("lng")).toBe("-0.1252");
    expect(url.searchParams.get("zoom")).toBe(String(LOCALITY_MAP_ZOOM));
  });

  it("never links to the /map route, which does not exist", () => {
    const href = buildLocalityMapUrl({ city: "London", lat: 51.515, lng: -0.1252 });
    expect(href.startsWith("/search?")).toBe(true);
  });

  it("falls back to the centre of the loaded buildings when the locality has no coordinate", () => {
    const href = buildLocalityMapUrl({
      city: "Rotterdam",
      lat: null,
      lng: null,
      buildings: [point(51.9, 4.47), point(51.91, 4.48), point(51.92, 4.49)],
    });

    const url = new URL(href, "https://plano.test");
    expect(url.searchParams.get("lat")).toBe("51.91");
    expect(url.searchParams.get("lng")).toBe("4.48");
  });

  it("falls back to a city text search when no coordinate exists anywhere", () => {
    expect(
      buildLocalityMapUrl({ city: "São Paulo", lat: null, lng: null, buildings: [] }),
    ).toBe("/search?q=S%C3%A3o%20Paulo");
  });

  it("ignores out-of-range and non-finite coordinates", () => {
    expect(buildLocalityMapUrl({ city: "Nowhere", lat: 99, lng: 12 })).toBe("/search?q=Nowhere");
    expect(buildLocalityMapUrl({ city: "Nowhere", lat: 40, lng: 999 })).toBe("/search?q=Nowhere");
    expect(buildLocalityMapUrl({ city: "Nowhere", lat: NaN, lng: 12 })).toBe("/search?q=Nowhere");
  });

  it("treats (0, 0) as 'no location' rather than Null Island", () => {
    expect(buildLocalityMapUrl({ city: "Nowhere", lat: 0, lng: 0, buildings: [point(0, 0)] })).toBe(
      "/search?q=Nowhere",
    );
  });
});

describe("deriveLocalityCenter", () => {
  it("returns null when no building is geolocated", () => {
    expect(deriveLocalityCenter([point(0, 0), point(0, 0)])).toBeNull();
  });

  it("uses the median so one mis-geocoded building cannot drag the centre out of town", () => {
    // Four Barcelona buildings plus one row geocoded into the sea.
    const center = deriveLocalityCenter([
      point(41.39, 2.16),
      point(41.4, 2.17),
      point(41.41, 2.18),
      point(41.38, 2.15),
      point(41.4, 12.5),
    ]);

    expect(center?.lng).toBeCloseTo(2.17, 2);
  });

  it("skips the (0, 0) sentinel when averaging", () => {
    const center = deriveLocalityCenter([point(0, 0), point(48.85, 2.35), point(48.87, 2.37)]);
    expect(center?.lat).toBeCloseTo(48.86, 2);
  });
});
