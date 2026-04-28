import { useEffect, type RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

/**
 * Wheel/trackpad zoom when the cursor is over HTML overlays (pins, popups).
 * React's onWheel often cannot cancel scrolling (passive listeners); MapLibre only
 * receives wheel on the canvas. A capture‑phase listener on the map container
 * with passive:false matches MapLibre's handler and runs before the event
 * reaches overlay descendants.
 */
export function useMapWheelZoomCapture(
  mapRef: RefObject<MapRef | null>,
  mapLoaded: boolean
): void {
  useEffect(() => {
    if (!mapLoaded) return;
    const maplibreMap = mapRef.current?.getMap();
    if (
      !maplibreMap ||
      typeof maplibreMap.getContainer !== 'function' ||
      typeof maplibreMap.scrollZoom?.wheel !== 'function'
    ) {
      return;
    }

    const container = maplibreMap.getContainer();
    const onWheelCapture = (e: WheelEvent) => {
      maplibreMap.scrollZoom.wheel(e);
      e.preventDefault();
      e.stopPropagation();
    };

    container.addEventListener('wheel', onWheelCapture, { capture: true, passive: false });
    return () => {
      container.removeEventListener('wheel', onWheelCapture, { capture: true });
    };
  }, [mapLoaded]);
}
