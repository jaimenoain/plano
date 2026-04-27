import { useMemo } from "react";
import Map, { Source, Layer, type LayerProps } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router";
import type { TopPhotoBuilding } from "@/features/admin/types/admin";
import { getBuildingUrl } from "@/utils/url";

interface PhotoActivityZoneProps {
  data: TopPhotoBuilding[];
}

const HEATMAP_LAYER: LayerProps = {
  id: "photo-heatmap",
  type: "heatmap",
  maxzoom: 9,
  paint: {
    "heatmap-weight": [
      "interpolate", ["linear"],
      ["get", "photo_count"],
      0, 0,
      50, 1
    ],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
    "heatmap-color": [
      "interpolate", ["linear"], ["heatmap-density"],
      0,   "rgba(33,102,172,0)",
      0.2, "rgb(103,169,207)",
      0.4, "rgb(209,229,240)",
      0.6, "rgb(253,219,199)",
      0.8, "rgb(239,138,98)",
      1,   "rgb(178,24,43)"
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 9, 20],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0]
  }
};

const CIRCLE_LAYER: LayerProps = {
  id: "photo-points",
  type: "circle",
  minzoom: 7,
  paint: {
    "circle-radius": [
      "interpolate", ["linear"],
      ["get", "photo_count"],
      1, 4,
      50, 16
    ],
    "circle-color": "rgb(178,24,43)",
    "circle-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 0.9],
    "circle-stroke-color": "white",
    "circle-stroke-width": 1
  }
};

export function PhotoActivityZone({ data }: PhotoActivityZoneProps) {
  const maxCount = data[0]?.photo_count ?? 1;

  const geoJsonData = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: data.map(b => ({
      type: "Feature" as const,
      properties: { photo_count: b.photo_count },
      geometry: { type: "Point" as const, coordinates: [b.lng, b.lat] }
    }))
  }), [data]);

  return (
    <Card>
      <Tabs defaultValue="table">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Photo Activity</CardTitle>
          <TabsList>
            <TabsTrigger value="table">Top Buildings</TabsTrigger>
            <TabsTrigger value="map">Heatmap</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="p-0">
          <TabsContent value="table" className="mt-0">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-6">#</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right pr-6">Photos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell className="pl-6 text-text-secondary tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <Link
                          to={getBuildingUrl(b.id, b.slug ?? undefined)}
                          className="font-medium hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {b.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-secondary">{b.city ?? "—"}</TableCell>
                      <TableCell className="text-text-secondary">{b.country_code ?? "—"}</TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-24 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-text-primary"
                              style={{ width: `${(b.photo_count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-sm font-medium w-8 text-right">
                            {b.photo_count}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="map" className="mt-0">
            <div className="h-[500px] overflow-hidden rounded-b-lg">
              <Map
                initialViewState={{ latitude: 20, longitude: 0, zoom: 1.5 }}
                style={{ width: "100%", height: "100%" }}
                mapStyle="https://tiles.openfreemap.org/styles/positron"
                mapLib={maplibregl}
                attributionControl={false}
              >
                <Source type="geojson" data={geoJsonData}>
                  <Layer {...HEATMAP_LAYER} />
                  <Layer {...CIRCLE_LAYER} />
                </Source>
              </Map>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
