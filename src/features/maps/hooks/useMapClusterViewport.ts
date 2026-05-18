import { useCallback, useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { Bounds } from '@/utils/map';

/** Throttle pan-driven cluster refetches; zoom-level changes flush immediately. */
const CLUSTER_VIEWPORT_THROTTLE_MS = 150;

export function boundsFromMap(map: maplibregl.Map): Bounds {
  const b = map.getBounds();
  return {
    north: b.getNorth(),
    south: b.getSouth(),
    east: b.getEast(),
    west: b.getWest(),
  };
}

export interface MapClusterViewport {
  bounds: Bounds;
  zoom: number;
}

/**
 * Live map viewport for cluster RPCs. Updates during pan/zoom (throttled on pan,
 * immediate when the integer zoom level changes) so bubbles match the map while
 * MapContext bounds can still update only on move end for the sidebar list.
 */
export function useMapClusterViewport() {
  const [viewport, setViewport] = useState<MapClusterViewport | null>(null);
  const lastZoomIntRef = useRef<number | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ map: maplibregl.Map; zoom: number } | null>(null);

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, []);

  const flushViewport = useCallback((map: maplibregl.Map, zoom: number) => {
    lastZoomIntRef.current = Math.round(zoom);
    setViewport({ bounds: boundsFromMap(map), zoom });
  }, []);

  const scheduleViewportUpdate = useCallback(
    (map: maplibregl.Map, zoom: number) => {
      const zoomInt = Math.round(zoom);
      const zoomChanged =
        lastZoomIntRef.current === null || lastZoomIntRef.current !== zoomInt;

      pendingRef.current = { map, zoom };

      if (zoomChanged) {
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
        flushViewport(map, zoom);
        return;
      }

      if (throttleTimerRef.current) return;

      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
        const pending = pendingRef.current;
        if (pending) flushViewport(pending.map, pending.zoom);
      }, CLUSTER_VIEWPORT_THROTTLE_MS);
    },
    [flushViewport]
  );

  const flushPendingViewport = useCallback(
    (map: maplibregl.Map, zoom: number) => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      pendingRef.current = null;
      flushViewport(map, zoom);
    },
    [flushViewport]
  );

  return { viewport, scheduleViewportUpdate, flushPendingViewport };
}
