/**
 * Helpers for Explore location filtering: viewport extraction from Google Geocoder
 * and bounds validation aligned with get_discovery_feed (migration 20270867000000).
 */

export type ExploreViewportBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/** Reads Google Geocoder viewport; returns null if missing. */
export function extractGeocodeViewportBounds(
  details: google.maps.GeocoderResult
): ExploreViewportBounds | null {
  const vp = details.geometry?.viewport;
  if (!vp || typeof vp.getNorthEast !== "function" || typeof vp.getSouthWest !== "function") {
    return null;
  }
  const ne = vp.getNorthEast();
  const sw = vp.getSouthWest();
  const minLat = Math.min(ne.lat(), sw.lat());
  const maxLat = Math.max(ne.lat(), sw.lat());
  const minLng = Math.min(ne.lng(), sw.lng());
  const maxLng = Math.max(ne.lng(), sw.lng());
  return { minLat, maxLat, minLng, maxLng };
}

/** Mirrors get_discovery_feed tier-2 caps (max span, min size, dateline guard). */
export function isExploreViewportWithinRpcLimits(bounds: ExploreViewportBounds): boolean {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  if (!(minLat <= maxLat)) return false;
  const dLat = maxLat - minLat;
  const dLng = maxLng - minLng;
  if (dLat <= 1e-7 || dLng <= 1e-7) return false;
  if (dLng > 179) return false;
  if (dLat > 25 || dLng > 25) return false;
  return true;
}
