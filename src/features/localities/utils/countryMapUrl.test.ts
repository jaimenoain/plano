import { describe, it, expect } from "vitest";
import { buildCountryMapUrl, geolocatedCities, COUNTRY_MAP_ZOOM } from "./countryMapUrl";
import type { CountryCity } from "../api/countryGuideApi";

function city(overrides: Partial<CountryCity> = {}): CountryCity {
  return {
    city: "Madrid",
    city_slug: "madrid",
    buildings_count: 10,
    preview_image_url: null,
    lat: 40.4196,
    lng: -3.6979,
    highlights: [],
    ...overrides,
  };
}

describe("geolocatedCities", () => {
  it("keeps only plottable coordinates", () => {
    const kept = geolocatedCities([
      city({ city_slug: "ok" }),
      city({ city_slug: "null-coords", lat: null, lng: null }),
      city({ city_slug: "null-island", lat: 0, lng: 0 }),
      city({ city_slug: "out-of-range", lat: 91, lng: 0 }),
      city({ city_slug: "not-finite", lat: Number.NaN, lng: 0 }),
    ]);
    expect(kept.map((c) => c.city_slug)).toEqual(["ok"]);
  });
});

describe("buildCountryMapUrl", () => {
  it("centres the search map on the extent of the busiest cities", () => {
    const url = buildCountryMapUrl("Spain", [
      city({ city_slug: "madrid", lat: 40, lng: -4 }),
      city({ city_slug: "barcelona", lat: 42, lng: 2 }),
    ]);
    const params = new URL(url, "https://plano.test").searchParams;
    expect(params.get("lat")).toBe("41");
    expect(params.get("lng")).toBe("-1");
    expect(params.get("zoom")).toBe(String(COUNTRY_MAP_ZOOM));
  });

  it("ignores cities with no coordinate", () => {
    const url = buildCountryMapUrl("Spain", [
      city({ city_slug: "madrid", lat: 40, lng: -4 }),
      city({ city_slug: "unlocated", lat: null, lng: null }),
    ]);
    const params = new URL(url, "https://plano.test").searchParams;
    expect(params.get("lat")).toBe("40");
    expect(params.get("lng")).toBe("-4");
  });

  it("falls back to a name search when nothing is geolocated", () => {
    expect(buildCountryMapUrl("Côte d'Ivoire", [city({ lat: null, lng: null })])).toBe(
      "/map?q=C%C3%B4te%20d'Ivoire",
    );
    expect(buildCountryMapUrl("Spain", [])).toBe("/map?q=Spain");
  });

  it("frames on the leading cities so an outlying territory can't drag the viewport", () => {
    const mainland = Array.from({ length: 20 }, (_, i) =>
      city({ city_slug: `city-${i}`, lat: 40 + i * 0.1, lng: -4 }),
    );
    const outlier = city({ city_slug: "far-away", lat: -50, lng: 170 });
    const url = buildCountryMapUrl("Spain", [...mainland, outlier]);
    const params = new URL(url, "https://plano.test").searchParams;
    expect(Number(params.get("lat"))).toBeCloseTo(40.95, 5);
    expect(Number(params.get("lng"))).toBe(-4);
  });
});
