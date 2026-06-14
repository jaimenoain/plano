import { describe, it, expect } from "vitest";
import { extractLocationDetails } from "./location-utils";

// Characterization tests: lock in the CURRENT behavior of extractLocationDetails,
// including its country-aware city resolution (GB prefers postal_town).

const component = (long_name: string, short_name: string, types: string[]) => ({
  long_name,
  short_name,
  types,
});

describe("extractLocationDetails", () => {
  it("returns all-null for null / undefined / missing address_components", () => {
    const allNull = { city: null, country: null, countryCode: null };
    expect(extractLocationDetails(null)).toEqual(allNull);
    expect(extractLocationDetails(undefined)).toEqual(allNull);
    expect(extractLocationDetails({})).toEqual(allNull);
  });

  it("extracts city, country and ISO country code for a non-GB result", () => {
    const result = {
      address_components: [
        component("San Francisco", "San Francisco", ["locality"]),
        component("United States", "US", ["country"]),
      ],
    };
    expect(extractLocationDetails(result)).toEqual({
      city: "San Francisco",
      country: "United States",
      countryCode: "US",
    });
  });

  it("prefers postal_town over locality for GB results", () => {
    const result = {
      address_components: [
        component("Westminster", "Westminster", ["locality"]),
        component("London", "London", ["postal_town"]),
        component("United Kingdom", "GB", ["country"]),
      ],
    };
    expect(extractLocationDetails(result)).toEqual({
      city: "London",
      country: "United Kingdom",
      countryCode: "GB",
    });
  });

  it("falls back to locality for GB when no postal_town is present", () => {
    const result = {
      address_components: [
        component("Westminster", "Westminster", ["locality"]),
        component("United Kingdom", "GB", ["country"]),
      ],
    };
    expect(extractLocationDetails(result).city).toBe("Westminster");
  });

  it("falls back to postal_town for non-GB when no locality is present", () => {
    const result = {
      address_components: [
        component("Reading", "Reading", ["postal_town"]),
        component("United States", "US", ["country"]),
      ],
    };
    expect(extractLocationDetails(result).city).toBe("Reading");
  });

  it("returns null fields when the relevant components are absent", () => {
    const result = {
      address_components: [
        component("Some County", "Some County", ["administrative_area_level_2"]),
      ],
    };
    expect(extractLocationDetails(result)).toEqual({
      city: null,
      country: null,
      countryCode: null,
    });
  });
});
