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

const HEATMAP_LAYER: LayerProps = {
  id: 'heatmap',
  type: 'heatmap',
  maxzoom: 9,
  paint: {
    // Increase the heatmap weight based on frequency and property magnitude
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['get', 'weight'],
      0, 0,
      50, 1
    ],
    // Increase the heatmap color weight weight by zoom level
    // heatmap-intensity is a multiplier on top of heatmap-weight
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1,
      9, 3
    ],
    // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
    // Begin color ramp at 0-stop with a 0-transparency color
    // to create a blur-like effect.
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0,0,255,0)',
      0.2, 'royalblue',
      0.4, 'cyan',
      0.6, 'lime',
      0.8, 'yellow',
      1, 'red'
    ],
    // Adjust the heatmap radius by zoom level
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 2,
      9, 20
    ],
    // Transition from heatmap to circle layer by zoom level
    'heatmap-opacity': 1
  }
};

const CIRCLE_LAYER: LayerProps = {
  id: 'heatmap-circles',
  type: 'circle',
  minzoom: 9,
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      9, 5,
      15, 20
    ],
    'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'weight'],
        1, 'cyan',
        10, 'yellow',
        50, 'red'
    ],
    'circle-stroke-color': 'white',
    'circle-stroke-width': 1,
    'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      9, 0,
      10, 1
    ]
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
        <CardTitle>Global Photo Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-[500px] p-0 overflow-hidden rounded-b-lg relative">
        <Map
          initialViewState={{
            latitude: 20,
            longitude: 0,
            zoom: 1.5
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://tiles.openfreemap.org/styles/dark"
          mapLib={maplibregl}
          attributionControl={false}
        >
          <Source type="geojson" data={geoJsonData}>
            <Layer {...HEATMAP_LAYER} />
            <Layer {...CIRCLE_LAYER} />
          </Source>
        </Map>
      </CardContent>
    </Card>
  );
}
