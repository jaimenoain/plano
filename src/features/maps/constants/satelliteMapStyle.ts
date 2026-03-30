import type { StyleSpecification } from "maplibre-gl";

/** Shared raster satellite basemap for MapLibre (typed for react-map-gl/maplibre). */
export const SATELLITE_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "satellite-tiles": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "&copy; Esri",
    },
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster",
      source: "satellite-tiles",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};
