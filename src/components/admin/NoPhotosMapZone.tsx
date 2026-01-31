import { useEffect, useState, useMemo } from 'react';
import Map, { Source, Layer, LayerProps, NavigationControl } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { parseLocation } from "@/utils/location";
import { Loader2 } from "lucide-react";

interface NoPhotoBuilding {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const CIRCLE_LAYER: LayerProps = {
  id: 'no-photos-circles',
  type: 'circle',
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 3,
      5, 4,
      10, 6,
      15, 8
    ],
    'circle-color': '#ef4444', // Red-500
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1,
    'circle-opacity': 0.8
  }
};

export function NoPhotosMapZone() {
  const [buildings, setBuildings] = useState<NoPhotoBuilding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select('id, name, location')
          .is('hero_image_url', null)
          .is('community_preview_url', null)
          .eq('is_deleted', false)
          .limit(2000);

        if (error) throw error;

        const mapped = (data || []).map(b => {
            const coords = parseLocation(b.location);
            if (!coords) return null;
            return {
                id: b.id,
                name: b.name,
                lat: coords.lat,
                lng: coords.lng
            };
        }).filter((b): b is NoPhotoBuilding => b !== null);

        setBuildings(mapped);
      } catch (err) {
        console.error("Failed to load no-photo buildings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBuildings();
  }, []);

  const geoJsonData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: buildings.map(b => ({
        type: 'Feature' as const,
        properties: { id: b.id, name: b.name },
        geometry: {
          type: 'Point' as const,
          coordinates: [b.lng, b.lat]
        }
      }))
    };
  }, [buildings]);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Buildings Missing Photos ({buildings.length})</CardTitle>
      </CardHeader>
      <CardContent className="h-[500px] p-0 overflow-hidden rounded-b-lg relative">
        {loading && (
             <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="h-8 w-8 animate-spin" />
             </div>
        )}
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
          <NavigationControl position="top-right" />
          <Source type="geojson" data={geoJsonData}>
            <Layer {...CIRCLE_LAYER} />
          </Source>
        </Map>
      </CardContent>
    </Card>
  );
}
