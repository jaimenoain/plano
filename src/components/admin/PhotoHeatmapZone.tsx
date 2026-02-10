import { useMemo } from 'react';
import Map, { Source, Layer, LayerProps } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PhotoHeatmapZoneProps {
  data: {
    lat: number;
    lng: number;
    weight: number;
  }[];
}

const CIRCLE_LAYER: LayerProps = {
  id: 'heatmap-circles',
  type: 'circle',
  minzoom: 0, // Allow at all zooms since heatmap is gone
  paint: {
    'circle-radius': 6,
    'circle-color': '#FF0000',
    'circle-stroke-color': 'white',
    'circle-stroke-width': 1,
    'circle-opacity': 1
  }
};

export function PhotoHeatmapZone({ data }: PhotoHeatmapZoneProps) {
  const geoJsonData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: data.map(point => ({
        type: 'Feature' as const,
        properties: { weight: point.weight },
        geometry: {
          type: 'Point' as const,
          coordinates: [point.lng, point.lat]
        }
      }))
    };
  }, [data]);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Global Photo Distribution (Static)</CardTitle>
      </CardHeader>
      <CardContent className="h-[500px] p-0 overflow-hidden rounded-b-lg relative">
        <Map
          initialViewState={{
            latitude: 20,
            longitude: 0,
            zoom: 1.5
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://tiles.openfreemap.org/styles/positron"
          mapLib={maplibregl}
          attributionControl={false}
        >
          <Source type="geojson" data={geoJsonData}>
            <Layer {...CIRCLE_LAYER} />
          </Source>
        </Map>
      </CardContent>
    </Card>
  );
}
