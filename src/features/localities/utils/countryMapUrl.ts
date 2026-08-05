import type { CountryCity } from "../api/countryGuideApi";

/** Zoom that frames a whole country on the search map, rather than one city. */
export const COUNTRY_MAP_ZOOM = 6;

function isUsableCoord(lat: number | null, lng: number | null): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  // (0, 0) is the "no location" sentinel, and Null Island is never a city.
  return lat !== 0 || lng !== 0;
}

/** Cities with a coordinate good enough to plot or centre on. */
export function geolocatedCities(cities: CountryCity[]): CountryCity[] {
  return cities.filter((c) => isUsableCoord(c.lat, c.lng));
}

/**
 * The country guide's "Explore the map" destination: the search map, opened
 * over the country.
 *
 * `/map` reads `lat`/`lng`/`zoom` straight into the map store, and supplying
 * a coordinate also suppresses the page's silent geolocation prompt — so the
 * visitor lands on the country instead of the zoom-2 world view or their own
 * GPS position.
 *
 * The centre is the midpoint of the extent of the cities that carry the most
 * buildings, weighted by nothing more clever than that: it only has to put the
 * country on screen. Falls back to a text search when no city is geolocated.
 */
export function buildCountryMapUrl(countryName: string, cities: CountryCity[]): string {
  const located = geolocatedCities(cities);
  if (located.length === 0) return `/map?q=${encodeURIComponent(countryName)}`;

  // The busiest cities define the frame; a lone outlying territory shouldn't
  // drag the viewport off the mainland the visitor is actually going to.
  const frame = located.slice(0, 20);
  const lats = frame.map((c) => c.lat as number);
  const lngs = frame.map((c) => c.lng as number);

  const params = new URLSearchParams({
    lat: String((Math.min(...lats) + Math.max(...lats)) / 2),
    lng: String((Math.min(...lngs) + Math.max(...lngs)) / 2),
    zoom: String(COUNTRY_MAP_ZOOM),
  });
  return `/map?${params.toString()}`;
}
