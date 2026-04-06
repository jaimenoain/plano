import { jsx, Fragment, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router";
import { ad as useItineraryStore, ae as useMap, af as Source, ag as Layer, ah as DAY_COLORS, ai as MapErrorBoundary, aj as useURLMapState, ak as useStableMapUpdate, al as getBoundsFromBuildings, am as Map$1, an as SATELLITE_MAP_STYLE, ao as GeolocateControl, ap as NavigationControl, aq as MapMarkers } from "./server-build-Ba14vd6D.js";
import maplibregl from "maplibre-gl";
import { Loader2, Layers, Minimize2, Maximize2 } from "lucide-react";
import "@vercel/react-router/entry.server";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@tanstack/react-query";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-toast";
import "next-themes";
import "sonner";
import "@supabase/ssr";
import "vaul";
import "react-error-boundary";
import "@sentry/react";
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
import "react-hook-form";
import "@hookform/resolvers/zod";
function ItineraryRoutes() {
  const days = useItineraryStore((state) => state.days);
  const { current: map } = useMap();
  const [firstSymbolId, setFirstSymbolId] = useState(void 0);
  useEffect(() => {
    if (!map) return void 0;
    const findFirstSymbolLayer = () => {
      const style = map.getStyle();
      if (!style || !style.layers) return void 0;
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
      if (!day.routeGeometry) return null;
      const color = DAY_COLORS[index % DAY_COLORS.length];
      const isFallback = day.isFallback;
      return /* @__PURE__ */ jsx(
        Source,
        {
          id: `route-source-${day.dayNumber}`,
          type: "geojson",
          data: day.routeGeometry,
          children: /* @__PURE__ */ jsx(
            Layer,
            {
              id: `route-layer-${day.dayNumber}`,
              type: "line",
              beforeId: firstSymbolId,
              layout: {
                "line-join": "round",
                "line-cap": "round"
              },
              paint: {
                "line-color": color,
                "line-width": 4,
                "line-dasharray": isFallback ? [2, 2] : void 0
              }
            }
          )
        },
        `route-source-${day.dayNumber}`
      );
    });
  }, [days, firstSymbolId]);
  return /* @__PURE__ */ jsx(Fragment, { children: routes });
}
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
function CollectionMapGLContent({
  buildings,
  highlightedId,
  setHighlightedId,
  onRemoveItem,
  onAddCandidate,
  onUpdateMarkerNote: _onUpdateMarkerNote,
  onRemoveMarker: _onRemoveMarker,
  showSavedCandidates: _showSavedCandidates,
  showItinerary
}) {
  const { lat, lng, zoom, setMapURL } = useURLMapState();
  const { updateMapState } = useStableMapUpdate(setMapURL);
  const mapRef = useRef(null);
  const days = useItineraryStore((state) => state.days);
  const itineraryMap = useMemo(() => {
    if (!showItinerary) return /* @__PURE__ */ new Map();
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
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const geolocateControlRef = useRef(null);
  const [viewState, setViewState] = useState({
    latitude: lat,
    longitude: lng,
    zoom
  });
  useEffect(() => {
    setViewState((prev) => {
      const isSame = Math.abs(prev.latitude - lat) < 1e-6 && Math.abs(prev.longitude - lng) < 1e-6 && Math.abs(prev.zoom - zoom) < 0.01;
      if (isSame) return prev;
      return { latitude: lat, longitude: lng, zoom };
    });
  }, [lat, lng, zoom]);
  useEffect(() => {
    if (!hasFittedBounds && buildings.length > 0 && mapRef.current && isMapLoaded) {
      if (shouldAutoFit) {
        const bounds = getBoundsFromBuildings(buildings);
        if (bounds) {
          const camera = mapRef.current.getMap().cameraForBounds(
            [
              [bounds.west, bounds.south],
              [bounds.east, bounds.north]
            ],
            { padding: 50 }
          );
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
  if (!isClient) {
    return /* @__PURE__ */ jsx("div", { className: "relative h-full w-full overflow-hidden bg-surface-default", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: "flex h-full min-h-[240px] w-full items-center justify-center bg-surface-muted",
        "aria-hidden": true,
        children: /* @__PURE__ */ jsx(Loader2, { className: "h-8 w-8 animate-spin text-text-secondary" })
      }
    ) });
  }
  const mapContent = /* @__PURE__ */ jsxs("div", { className: `relative h-full w-full overflow-hidden bg-surface-default ${isExpanded ? "fixed inset-0 z-[9999]" : ""}`, children: [
    /* @__PURE__ */ jsxs(
      Map$1,
      {
        ref: mapRef,
        ...viewState,
        onMove,
        onMoveEnd,
        onLoad: () => setIsMapLoaded(true),
        mapLib: maplibregl,
        mapStyle: isSatellite ? SATELLITE_MAP_STYLE : MAP_STYLE,
        attributionControl: false,
        onClick: () => setHighlightedId(null),
        children: [
          /* @__PURE__ */ jsx(
            GeolocateControl,
            {
              ref: geolocateControlRef,
              position: "bottom-right",
              positionOptions: { enableHighAccuracy: true },
              trackUserLocation: true,
              showUserLocation: true
            }
          ),
          /* @__PURE__ */ jsx(NavigationControl, { position: "bottom-right" }),
          showItinerary && /* @__PURE__ */ jsx(ItineraryRoutes, {}),
          /* @__PURE__ */ jsx(
            MapMarkers,
            {
              clusters,
              highlightedId,
              setHighlightedId,
              onRemoveFromCollection: handleRemove,
              onAddCandidate: handleAddCandidate
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "absolute top-2 left-2 flex flex-col gap-2 z-[60]", children: /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          setIsSatellite(!isSatellite);
        },
        className: "p-2 bg-surface-card/90 backdrop-blur-sm border border-border-default rounded-sm shadow-md hover:bg-surface-muted transition-colors flex items-center gap-2",
        title: isSatellite ? "Show Map" : "Show Satellite",
        children: [
          /* @__PURE__ */ jsx(Layers, { className: "w-4 h-4" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium hidden sm:inline", children: isSatellite ? "Map" : "Satellite" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        },
        className: "absolute top-2 right-2 p-2 bg-surface-card/90 backdrop-blur-sm border border-border-default rounded-sm shadow-md hover:bg-surface-muted transition-colors z-[60]",
        title: isExpanded ? "Collapse Map" : "Expand Map",
        children: isExpanded ? /* @__PURE__ */ jsx(Minimize2, { className: "w-4 h-4" }) : /* @__PURE__ */ jsx(Maximize2, { className: "w-4 h-4" })
      }
    )
  ] });
  if (isExpanded) {
    return createPortal(mapContent, document.body);
  }
  return mapContent;
}
function CollectionMapGL(props) {
  return /* @__PURE__ */ jsx(MapErrorBoundary, { children: /* @__PURE__ */ jsx(CollectionMapGLContent, { ...props }) });
}
export {
  CollectionMapGL
};
