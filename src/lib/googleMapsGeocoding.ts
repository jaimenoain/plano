/**
 * Thin Geocoding helpers (replaces use-places-autocomplete exports).
 * Uses google.maps.Geocoder only — no legacy Places AutocompleteService.
 */
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
