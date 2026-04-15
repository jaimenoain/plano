// src/lib/location-utils.ts
//
// CHANGED: extractLocationDetails now also returns countryCode (ISO 3166-1 alpha-2).
// Google Maps address_components include a "country" component whose short_name
// is the 2-letter ISO code (e.g. "GB", "DE", "US"). We surface it here so
// callers can pass it straight to buildings.country_code without any
// client-side name→code conversion.
//
// All existing callers only destructure { city, country } — adding countryCode
// is backward-compatible (no call sites need to change to keep working).
// Call sites that write to buildings should also pass countryCode so the trigger
// can skip its own lookup and use the authoritative value from Google.

type GeocoderAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GeocoderResultLike = {
  address_components?: GeocoderAddressComponent[];
};

/**
 * Extracts city, country name, and ISO country code from a Google Maps
 * GeocoderResult (or any object with address_components in the same shape).
 *
 * Returns:
 *   city        — long_name of the locality/postal_town/administrative_area_level_2 component
 *   country     — long_name of the country component (e.g. "United Kingdom")
 *   countryCode — short_name of the country component (e.g. "GB")
 *
 * All three fields may be null if the relevant component is absent.
 */
export const extractLocationDetails = (
  result: GeocoderResultLike | null | undefined,
): { city: string | null; country: string | null; countryCode: string | null } => {
  if (!result?.address_components) {
    return { city: null, country: null, countryCode: null };
  }

  const components = result.address_components;

  const findComponent = (types: string[]): GeocoderAddressComponent | undefined =>
    components.find((c) => types.some((t) => c.types.includes(t)));

  // City: prefer "locality", fall back to "postal_town" (common in the UK),
  // then "administrative_area_level_2" for rural areas.
  const cityComponent = findComponent([
    "locality",
    "postal_town",
    "administrative_area_level_2",
  ]);

  const countryComponent = findComponent(["country"]);

  return {
    city:        cityComponent?.long_name  ?? null,
    country:     countryComponent?.long_name  ?? null,   // e.g. "United Kingdom"
    countryCode: countryComponent?.short_name ?? null,   // e.g. "GB"
  };
};