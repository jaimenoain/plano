import { useState, useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { config } from "@/config";

interface Marker {
  id: string;
  google_place_id: string | null;
}

interface PhotoData {
  url: string;
  attribution: string[];
}

/** Legacy {@link google.maps.places.PlacesService.getDetails} expects a classic place id (e.g. `ChIJ…`). Places API (New) autocomplete may return `places/ChIJ…`. */
function placeIdForLegacyGetDetails(placeId: string): string {
  return placeId.startsWith("places/") ? placeId.slice("places/".length) : placeId;
}

function parseMarkersFromPhotoFetchKey(key: string): Marker[] {
  if (!key) return [];
  return key
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("\0");
      if (i === -1) return { id: line, google_place_id: null };
      const id = line.slice(0, i);
      const rawPlace = line.slice(i + 1);
      return { id, google_place_id: rawPlace.length > 0 ? rawPlace : null };
    });
}

export function useGooglePlacePhotos(markers: Marker[]) {
  const [photos, setPhotos] = useState<Record<string, PhotoData | null>>({});
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const [isLoaded, setIsLoaded] = useState(false);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);

  const markersFetchKey = markers
    .map((m) => `${m.id}\0${m.google_place_id ?? ""}`)
    .sort()
    .join("\n");

  useEffect(() => {
    let isMounted = true;

    const initMap = async (): Promise<void> => {
      if (window.google?.maps?.places) {
        if (!serviceRef.current) {
          serviceRef.current = new google.maps.places.PlacesService(document.createElement("div"));
        }
        if (isMounted) setIsLoaded(true);
        return undefined;
      }

      const apiKey = config.googleMaps.apiKey;
      if (!apiKey) {
        return undefined;
      }

      try {
        setOptions({ key: apiKey, v: "weekly" });
        await importLibrary("places");

        if (!serviceRef.current) {
          serviceRef.current = new google.maps.places.PlacesService(document.createElement("div"));
        }
        if (isMounted) setIsLoaded(true);
      } catch {
        // Missing key / blocked network — map still works without place photos
      }
    };

    void initMap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const markerIds = new Set(parseMarkersFromPhotoFetchKey(markersFetchKey).map((m) => m.id));
    setPhotos((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!markerIds.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [markersFetchKey]);

  useEffect(() => {
    if (!isLoaded || !serviceRef.current) return undefined;

    const service = serviceRef.current;
    const markerRows = parseMarkersFromPhotoFetchKey(markersFetchKey);

    const placeIdToMarkerIds = new Map<string, string[]>();
    for (const m of markerRows) {
      if (!m.google_place_id) continue;
      const legacyId = placeIdForLegacyGetDetails(m.google_place_id);
      const list = placeIdToMarkerIds.get(legacyId) ?? [];
      list.push(m.id);
      placeIdToMarkerIds.set(legacyId, list);
    }

    if (placeIdToMarkerIds.size === 0) return undefined;

    const pendingPlaceIds: string[] = [];
    for (const placeId of placeIdToMarkerIds.keys()) {
      const markerIds = placeIdToMarkerIds.get(placeId) ?? [];
      if (markerIds.some((id) => photosRef.current[id] === undefined)) {
        pendingPlaceIds.push(placeId);
      }
    }
    if (pendingPlaceIds.length === 0) return undefined;

    let cancelled = false;

    const run = async () => {
      for (const placeId of pendingPlaceIds) {
        if (cancelled) return;

        const markerIds = placeIdToMarkerIds.get(placeId) ?? [];

        await new Promise<void>((resolve) => {
          service.getDetails({ placeId, fields: ["photos"] }, (place, status) => {
            if (cancelled) {
              resolve();
              return;
            }

            let photoData: PhotoData | null = null;
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              place?.photos &&
              place.photos.length > 0
            ) {
              photoData = {
                url: place.photos[0].getUrl({ maxWidth: 400 }),
                attribution: place.photos[0].html_attributions || [],
              };
            }

            setPhotos((prev) => {
              const next = { ...prev };
              for (const id of markerIds) {
                if (next[id] === undefined) {
                  next[id] = photoData;
                }
              }
              return next;
            });
            resolve();
          });
        });

        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 200));
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [markersFetchKey, isLoaded]);

  return { photos };
}
