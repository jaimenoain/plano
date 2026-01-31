import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MapGL, { Marker, NavigationControl, MapRef } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Layers } from "lucide-react";
import Supercluster from "supercluster";

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

const SATELLITE_STYLE = {
  version: 8,
  sources: {
    "satellite-tiles": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      tileSize: 256,
      attribution: "&copy; Esri"
    }
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster",
      source: "satellite-tiles",
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

interface PipelineMapProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
}

export function PipelineMap({ items }: PipelineMapProps) {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const [isSatellite, setIsSatellite] = useState(false);

  // Filter items with valid location
  const validItems = useMemo(() => items.filter(item =>
    item.building &&
    typeof item.building.location_lat === 'number' &&
    typeof item.building.location_lng === 'number'
  ), [items]);

  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 2
  });

  // Determine bounds on initial load or when items change significantly
  useEffect(() => {
    if (validItems.length > 0 && mapRef.current) {
        const lats = validItems.map(i => i.building.location_lat);
        const lngs = validItems.map(i => i.building.location_lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Fit bounds with padding
        mapRef.current.fitBounds(
            [
                [minLng, minLat],
                [maxLng, maxLat]
            ],
            { padding: 80, duration: 1000 }
        );
    }
  }, [validItems]);

  const supercluster = useMemo(() => {
    return new Supercluster({
      radius: 40,
      maxZoom: 16
    });
  }, []);

  const points = useMemo(() => validItems.map(item => ({
    type: 'Feature' as const,
    properties: {
        cluster: false,
        buildingId: item.building.id,
        name: item.building.name,
        priority: item.priority
    },
    geometry: {
        type: 'Point' as const,
        coordinates: [item.building.location_lng, item.building.location_lat]
    }
  })), [validItems]);

  const [clusters, setClusters] = useState<any[]>([]);
  const viewStateRef = useRef(viewState);
  viewStateRef.current = viewState;

  const updateClusters = useMemo(() => {
    return () => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];
        const zoom = viewStateRef.current.zoom;
        setClusters(supercluster.getClusters(bbox, Math.round(zoom)));
    };
  }, [supercluster]);

  useEffect(() => {
    supercluster.load(points);
    updateClusters();
  }, [points, supercluster, updateClusters]);

  useEffect(() => {
    updateClusters();
  }, [viewState, updateClusters]);

  const pins = useMemo(() => clusters.map(cluster => {
    const [longitude, latitude] = cluster.geometry.coordinates;
    const { cluster: isCluster, point_count: pointCount } = cluster.properties;

    if (isCluster) {
        return (
            <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
                onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    const expansionZoom = Math.min(
                        supercluster.getClusterExpansionZoom(cluster.id),
                        20
                    );
                    mapRef.current?.flyTo({
                        center: [longitude, latitude],
                        zoom: expansionZoom,
                        duration: 500
                    });
                }}
            >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shadow-md border-2 border-background cursor-pointer hover:scale-110 transition-transform">
                    {pointCount}
                </div>
            </Marker>
        );
    }

    // Leaf node
    const { buildingId, name, priority } = cluster.properties;

    let pinColorClass = "text-slate-500 fill-slate-500";

    if (priority === 'Medium') {
        pinColorClass = "text-amber-500 fill-amber-500";
    } else if (priority === 'High') {
        pinColorClass = "text-rose-500 fill-rose-500";
    }

    return (
        <Marker
            key={buildingId}
            longitude={longitude}
            latitude={latitude}
            anchor="bottom"
            onClick={(e) => {
                e.originalEvent.stopPropagation();
                navigate(`/building/${buildingId}`);
            }}
            className="cursor-pointer hover:z-10"
        >
             <div className="group relative flex flex-col items-center">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center whitespace-nowrap z-50">
                    <div className="bg-[#333333] text-white text-xs px-2 py-1 rounded shadow-lg flex items-center gap-1 border border-white/20">
                        <span className="font-medium">{name}</span>
                        <span className="opacity-75 ml-1">({priority})</span>
                    </div>
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#333333]"></div>
                </div>

                <div className="relative transition-transform hover:scale-110">
                    <MapPin className={`w-8 h-8 ${pinColorClass} drop-shadow-md`} />
                    <div className="absolute top-[41.7%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] h-[25%] bg-white rounded-full pointer-events-none" />
                </div>
             </div>
        </Marker>
    );
  }), [clusters, navigate, supercluster]);

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-border relative bg-muted">
      <MapGL
        ref={mapRef}
        {...viewState}
        attributionControl={false}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={evt => {
            updateClusters();
        }}
        onMoveEnd={evt => {
             updateClusters();
        }}
        mapLib={maplibregl}
        style={{ width: "100%", height: "100%" }}
        mapStyle={isSatellite ? SATELLITE_STYLE : DEFAULT_MAP_STYLE}
      >
        <NavigationControl position="bottom-right" />
        {pins}
      </MapGL>

      <button
          onClick={(e) => {
              e.stopPropagation();
              setIsSatellite(!isSatellite);
          }}
          className="absolute top-2 left-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10 flex items-center gap-2"
          title={isSatellite ? "Show Map" : "Show Satellite"}
      >
          <Layers className="w-4 h-4" />
          <span className="text-xs font-medium">{isSatellite ? "Map" : "Satellite"}</span>
      </button>

      {validItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20 pointer-events-none">
              <div className="bg-background p-4 rounded-lg shadow-lg border text-center">
                  <p className="font-medium">No mapped buildings in pipeline</p>
                  <p className="text-sm text-muted-foreground">Add buildings with locations to see them on the map</p>
              </div>
          </div>
      )}
    </div>
  );
}
