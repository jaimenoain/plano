import { useEffect, useState, useMemo } from 'react';
import Map, { Source, Layer, LayerProps, NavigationControl } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { parseLocation } from "@/utils/location";
import { Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export interface NoPhotoBuilding {
  id: string;
  name: string;
  lat: number;
  lng: number;
  slug?: string | null;
}

const CIRCLE_LAYER: LayerProps = {
  id: 'no-photos-circles',
  type: 'circle',
  paint: {
    'circle-radius': 6,
    'circle-color': '#FF0000',
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1,
    'circle-opacity': 1
  }
};

// Extracted logic for testing
export const filterMissingPhotoBuildings = (
    buildings: any[],
    publicReviewBuildingIds: Set<string>,
    parseLocationFn: (loc: any) => { lat: number; lng: number } | null
): NoPhotoBuilding[] => {
    return buildings
        .filter(b => {
             // If it has a hero image, it's not "missing photos"
             if (b.hero_image_url) return false;
             // If it has public reviews with photos, it's not "missing photos"
             if (publicReviewBuildingIds.has(b.id)) return false;
             return true;
        })
        .map(b => {
            const coords = parseLocationFn(b.location);
            if (!coords) return null;
            return {
                id: b.id,
                name: b.name,
                lat: coords.lat,
                lng: coords.lng,
                slug: b.slug
            };
        })
        .filter((b): b is NoPhotoBuilding => b !== null);
};

export function NoPhotosMapZone() {
  const [buildings, setBuildings] = useState<NoPhotoBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string>('auto');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        // Step 1: Get IDs of buildings that have public photos (via public reviews with images)
        // We use !inner on review_images to ensure the review actually has images
        const { data: publicReviews, error: reviewError } = await supabase
          .from('user_buildings')
          .select('building_id, review_images!inner(id)')
          .eq('visibility', 'public');

        if (reviewError) throw reviewError;

        const buildingsWithPublicPhotos = new Set(
            publicReviews?.map(r => r.building_id).filter(Boolean)
        );

        // Step 2: Fetch buildings
        // We fetch a batch of buildings and filter client-side to ensure we catch those
        // that might have a 'hero_image_url' (so wouldn't be caught by .is(null))
        // but only have private photos (so aren't in buildingsWithPublicPhotos).
        const { data, error } = await supabase
          .from('buildings')
          .select('id, name, location, slug, hero_image_url')
          .eq('is_deleted', false)
          .limit(5000);

        if (error) throw error;

        const mapped = filterMissingPhotoBuildings(data || [], buildingsWithPublicPhotos, parseLocation);

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
        properties: { id: b.id, name: b.name, slug: b.slug },
        geometry: {
          type: 'Point' as const,
          coordinates: [b.lng, b.lat]
        }
      }))
    };
  }, [buildings]);

  const handleMapClick = (event: any) => {
    const feature = event.features?.[0];
    if (feature) {
      const { id, slug } = feature.properties;
      // Parse JSON if needed? No, mapbox/maplibre returns properties as object.
      // But ensure slug is handled if it's "null" string or actual null.
      // GeoJSON properties can sometimes serialize null as null.
      const url = slug ? `/building/${id}/${slug}` : `/building/${id}`;
      navigate(url);
    }
  };

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
          mapStyle="https://tiles.openfreemap.org/styles/positron"
          mapLib={maplibregl}
          attributionControl={false}
          interactiveLayerIds={['no-photos-circles']}
          onClick={handleMapClick}
          cursor={cursor}
          onMouseEnter={() => setCursor('pointer')}
          onMouseLeave={() => setCursor('auto')}
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
