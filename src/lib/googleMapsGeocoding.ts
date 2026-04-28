/**
 * Thin Geocoding helpers (replaces use-places-autocomplete exports).
 * Legacy {@link google.maps.Geocoder} for unstructured address strings.
 * For place IDs from Places API (New) autocomplete, prefer {@link fetchPlaceDetailsNew}.
 */

/** Details from {@link google.maps.places.Place.fetchFields} (Places API New). */
export type PlaceDetailsNew = {
  lat: number;
  lng: number;
  formattedAddress: string;
  types: string[];
  primaryType: string | null;
  displayName: string | null;
};

/**
 * Resolves coordinates and types via Places API (New) {@link google.maps.places.Place.fetchFields}.
 * Use for place IDs returned by {@link google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions}.
 */
export async function fetchPlaceDetailsNew(placeId: string): Promise<PlaceDetailsNew> {
  const Place = google.maps.places.Place;
  if (typeof Place !== "function") {
    throw new Error("PLACES_LIBRARY_NOT_LOADED");
  }
  const place = new Place({ id: placeId });
  await place.fetchFields({
    fields: ["displayName", "formattedAddress", "location", "types", "primaryType"],
  });
  const loc = place.location;
  if (!loc) {
    throw new Error("PLACE_NO_LOCATION");
  }
  const types = place.types ?? [];
  const primaryType = place.primaryType ?? null;
  return {
    lat: loc.lat(),
    lng: loc.lng(),
    formattedAddress: place.formattedAddress ?? "",
    types: types.length > 0 ? types : primaryType ? [primaryType] : [],
    primaryType,
    displayName: place.displayName ?? null,
  };
}

export async function getGeocode(
  request: google.maps.GeocoderRequest,
): Promise<google.maps.GeocoderResult[]> {
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode(request, (results, status) => {
      if (status !== "OK") {
        reject(status);
        return;
      }
      resolve(results ?? []);
    });
  });
}

export function getLatLng(result: google.maps.GeocoderResult): { lat: number; lng: number } {
  const loc = result.geometry.location;
  return { lat: loc.lat(), lng: loc.lng() };
}
