import { jsx, Fragment, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router";
import Map$1, { useMap, Source, Layer, GeolocateControl, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { ad as useItineraryStore, ae as DAY_COLORS, af as MapErrorBoundary, ag as useURLMapState, ah as useStableMapUpdate, ai as getBoundsFromBuildings, aj as SATELLITE_MAP_STYLE, ak as MapMarkers } from "./server-build-C6QCVg9l.js";
import { Layers, Minimize2, Maximize2 } from "lucide-react";
import "node:stream";
import "react-dom/server";
import "@tanstack/react-query";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-toast";
import "class-variance-authority";
import "next-themes";
import "sonner";
import "@supabase/supabase-js";
import "@radix-ui/react-slot";
import "vaul";
import "react-error-boundary";
import "@sentry/react";
import "@supabase/ssr";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
import "@radix-ui/react-checkbox";
import "@radix-ui/react-avatar";
import "zod";
import "use-places-autocomplete";
import "@googlemaps/js-api-loader";
import "cmdk";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-alert-dialog";
import "@radix-ui/react-radio-group";
import "embla-carousel-react";
import "recharts";
import "@radix-ui/react-toggle-group";
import "@radix-ui/react-toggle";
import "date-fns";
import "@radix-ui/react-tabs";
import "@radix-ui/react-switch";
import "@radix-ui/react-select";
import "framer-motion";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-popover";
import "@radix-ui/react-slider";
import "@radix-ui/react-accordion";
import "@dnd-kit/core";
import "@dnd-kit/sortable";
import "@dnd-kit/utilities";
import "@radix-ui/react-hover-card";
import "zustand";
import "@ffmpeg/ffmpeg";
import "@ffmpeg/util";
import "@radix-ui/react-aspect-ratio";
import "react-hook-form";
import "@hookform/resolvers/zod";
function ItineraryRoutes() {
  const days = useItineraryStore((state) => state.days);
  const { current: map } = useMap();
  const [firstSymbolId, setFirstSymbolId] = useState(void 0);
  useEffect(() => {
    if (!map)
      return void 0;
    const findFirstSymbolLayer = () => {
      const style = map.getStyle();
      if (!style || !style.layers)
        return void 0;
      const labelLayer = style.layers.find((layer) => layer.type === "symbol");
      if (labelLayer) {
        setFirstSymbolId(labelLayer.id);
      }
    };
    if (map.isStyleLoaded()) {
      findFirstSymbolLayer();
    }
    const onStyleLoad = () => findFirstSymbolLayer();
    map.on("style.load", onStyleLoad);
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [map]);
  const routes = useMemo(() => {
    return days.map((day, index) => {
      if (!day.routeGeometry)
        return null;
      const color = DAY_COLORS[index % DAY_COLORS.length];
      const isFallback = day.isFallback;
      return jsx(Source, { id: `route-source-${day.dayNumber}`, type: "geojson", data: day.routeGeometry, children: jsx(Layer, { id: `route-layer-${day.dayNumber}`, type: "line", beforeId: firstSymbolId, layout: {
        "line-join": "round",
        "line-cap": "round"
      }, paint: {
        "line-color": color,
        "line-width": 4,
        "line-dasharray": isFallback ? [2, 2] : void 0
      } }) }, `route-source-${day.dayNumber}`);
    });
  }, [days, firstSymbolId]);
  return jsx(Fragment, { children: routes });
}
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
function CollectionMapGLContent({ buildings, highlightedId, setHighlightedId, onRemoveItem, onAddCandidate, onUpdateMarkerNote: _onUpdateMarkerNote, onRemoveMarker: _onRemoveMarker, showSavedCandidates: _showSavedCandidates, showItinerary }) {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);
  const mapRef = useRef(null);
  const days = useItineraryStore((state) => state.days);
  const itineraryMap = useMemo(() => {
    if (!showItinerary)
      return /* @__PURE__ */ new Map();
    const map = /* @__PURE__ */ new Map();
    if (days) {
      days.forEach((day, dayIndex) => {
        var _a;
        (_a = day.stops) == null ? void 0 : _a.forEach((stop, index) => {
          const key = stop.referenceId || stop.id;
          if (!map.has(key)) {
            map.set(key, {
              dayIndex,
              sequence: index + 1
            });
          }
        });
      });
    }
    return map;
  }, [days, showItinerary]);
  const [searchParams] = useSearchParams();
  const [shouldAutoFit] = useState(() => !searchParams.has("lat") && !searchParams.has("lng"));
  const [isSatellite, setIsSatellite] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasFittedBounds, setHasFittedBounds] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const geolocateControlRef = useRef(null);
  const [viewState, setViewState] = useState({
    latitude: lat,
    longitude: lng,
    zoom
  });
  useEffect(() => {
    setViewState((prev) => {
      const isSame = Math.abs(prev.latitude - lat) < 1e-6 && Math.abs(prev.longitude - lng) < 1e-6 && Math.abs(prev.zoom - zoom) < 0.01;
      if (isSame)
        return prev;
      return { latitude: lat, longitude: lng, zoom };
    });
  }, [lat, lng, zoom]);
  useEffect(() => {
    if (!hasFittedBounds && buildings.length > 0 && mapRef.current && isMapLoaded) {
      if (shouldAutoFit) {
        const bounds = getBoundsFromBuildings(buildings);
        if (bounds) {
          const camera = mapRef.current.getMap().cameraForBounds([
            [bounds.west, bounds.south],
            [bounds.east, bounds.north]
          ], { padding: 50 });
          if (camera && camera.center && typeof camera.zoom === "number") {
            const { center, zoom: zoom2 } = camera;
            const ll = maplibregl.LngLat.convert(center);
            setViewState({
              latitude: ll.lat,
              longitude: ll.lng,
              zoom: zoom2
            });
            updateMapState({
              lat: ll.lat,
              lng: ll.lng,
              zoom: zoom2
            }, true);
            setHasFittedBounds(true);
          }
        }
      } else {
        setHasFittedBounds(true);
      }
    }
  }, [buildings, hasFittedBounds, shouldAutoFit, isMapLoaded, updateMapState]);
  const onMove = useCallback((evt) => {
    setViewState(evt.viewState);
    updateMapState({
      lat: evt.viewState.latitude,
      lng: evt.viewState.longitude,
      zoom: evt.viewState.zoom
    }, false);
  }, [updateMapState]);
  const onMoveEnd = useCallback((evt) => {
    updateMapState({
      lat: evt.viewState.latitude,
      lng: evt.viewState.longitude,
      zoom: evt.viewState.zoom
    }, true);
  }, [updateMapState]);
  const clusters = useMemo(() => {
    return buildings.map((b) => {
      const itineraryInfo = itineraryMap.get(b.id);
      return {
        id: b.id,
        lat: b.location_lat,
        lng: b.location_lng,
        is_cluster: false,
        count: 1,
        rating: b.personal_rating || null,
        status: b.personal_status || null,
        color: b.color || null,
        name: b.name,
        slug: b.slug || void 0,
        image_url: b.main_image_url || void 0,
        image_attribution: b.image_attribution || void 0,
        // Custom fields
        is_custom_marker: b.isMarker,
        marker_category: b.markerCategory,
        notes: b.notes ?? null,
        is_candidate: b.isCandidate,
        address: b.address ?? null,
        google_place_id: b.google_place_id,
        website: b.website,
        // Itinerary fields
        itinerary_sequence: itineraryInfo == null ? void 0 : itineraryInfo.sequence,
        itinerary_day_index: itineraryInfo == null ? void 0 : itineraryInfo.dayIndex
      };
    });
  }, [buildings, itineraryMap]);
  const handleAddCandidate = useCallback((id) => {
    if (onAddCandidate) {
      const building = buildings.find((b) => b.id === id);
      if (building) {
        onAddCandidate(building);
      }
    }
  }, [onAddCandidate, buildings]);
  const handleRemove = onRemoveItem;
  const mapContent = jsxs("div", { className: `relative h-full w-full overflow-hidden bg-surface-default ${isExpanded ? "fixed inset-0 z-[9999]" : ""}`, children: [jsxs(Map$1, { ref: mapRef, ...viewState, onMove, onMoveEnd, onLoad: () => setIsMapLoaded(true), mapLib: maplibregl, mapStyle: isSatellite ? SATELLITE_MAP_STYLE : MAP_STYLE, attributionControl: false, onClick: () => setHighlightedId(null), children: [jsx(GeolocateControl, { ref: geolocateControlRef, position: "bottom-right", positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserLocation: true }), jsx(NavigationControl, { position: "bottom-right" }), showItinerary && jsx(ItineraryRoutes, {}), jsx(MapMarkers, { clusters, highlightedId, setHighlightedId, onRemoveFromCollection: handleRemove, onAddCandidate: handleAddCandidate })] }), jsx("div", { className: "absolute top-2 left-2 flex flex-col gap-2 z-[60]", children: jsxs("button", { onClick: (e) => {
    e.stopPropagation();
    setIsSatellite(!isSatellite);
  }, className: "p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors flex items-center gap-2", title: isSatellite ? "Show Map" : "Show Satellite", children: [jsx(Layers, { className: "w-4 h-4" }), jsx("span", { className: "text-xs font-medium hidden sm:inline", children: isSatellite ? "Map" : "Satellite" })] }) }), jsx("button", { onClick: (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, className: "absolute top-2 right-2 p-2 bg-surface-default/90 backdrop-blur rounded-md border shadow-sm hover:bg-surface-muted transition-colors z-[60]", title: isExpanded ? "Collapse Map" : "Expand Map", children: isExpanded ? jsx(Minimize2, { className: "w-4 h-4" }) : jsx(Maximize2, { className: "w-4 h-4" }) })] });
  if (isExpanded) {
    return createPortal(mapContent, document.body);
  }
  return mapContent;
}
function CollectionMapGL(props) {
  return jsx(MapErrorBoundary, { children: jsx(CollectionMapGLContent, { ...props }) });
}
export {
  CollectionMapGL
};
