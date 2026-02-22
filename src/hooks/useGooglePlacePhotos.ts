import { useState, useEffect, useRef } from 'react';
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { config } from '@/config';

interface Marker {
  id: string;
  google_place_id: string | null;
}

interface PhotoData {
  url: string;
  attribution: string[];
}

export function useGooglePlacePhotos(markers: Marker[]) {
  const [photos, setPhotos] = useState<Record<string, PhotoData | null>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);
  const fetchingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      // Check if global google object exists and has places
      if (window.google?.maps?.places) {
        if (!serviceRef.current) {
             serviceRef.current = new google.maps.places.PlacesService(document.createElement('div'));
        }
        if (isMounted) setIsLoaded(true);
        return;
      }

      const apiKey = config.googleMaps.apiKey;
      if (!apiKey) return;

      try {
        setOptions({ key: apiKey, version: "weekly" });
        await importLibrary("places");

        if (!serviceRef.current) {
             serviceRef.current = new google.maps.places.PlacesService(document.createElement('div'));
        }
        if (isMounted) setIsLoaded(true);
      } catch (error) {
        console.error("Error loading Google Maps Places library", error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !serviceRef.current) return;

    let isMounted = true;
    const uniquePlaceIds = new Set<string>();
    const placeIdToMarkerIds = new Map<string, string[]>();

    markers.forEach(m => {
        // Only fetch if we haven't fetched for this marker ID yet
        if (m.google_place_id && photos[m.id] === undefined && !fetchingRef.current.has(m.id)) {
            uniquePlaceIds.add(m.google_place_id);

            const current = placeIdToMarkerIds.get(m.google_place_id) || [];
            current.push(m.id);
            placeIdToMarkerIds.set(m.google_place_id, current);

            fetchingRef.current.add(m.id);
        }
    });

    if (uniquePlaceIds.size === 0) return;

    const fetchDetails = async () => {
        for (const placeId of uniquePlaceIds) {
             if (!isMounted) break;

             const markerIds = placeIdToMarkerIds.get(placeId) || [];

             try {
                 await new Promise<void>((resolve) => {
                     serviceRef.current?.getDetails({
                         placeId: placeId,
                         fields: ['photos']
                     }, (place, status) => {
                         let photoData: PhotoData | null = null;
                         if (status === google.maps.places.PlacesServiceStatus.OK && place?.photos && place.photos.length > 0) {
                             photoData = {
                                 url: place.photos[0].getUrl({ maxWidth: 400 }),
                                 attribution: place.photos[0].html_attributions || []
                             };
                         }

                         if (isMounted) {
                             setPhotos(prev => {
                                 const next = { ...prev };
                                 markerIds.forEach(id => {
                                     next[id] = photoData;
                                 });
                                 return next;
                             });
                         }
                         resolve();
                     });
                 });
             } catch (e) {
                 console.error("Error fetching place details", e);
             }

             // Small delay to be polite
             if (isMounted) await new Promise(r => setTimeout(r, 200));
        }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };

  }, [markers, isLoaded, photos]);

  return { photos };
}
