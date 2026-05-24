import { useMemo } from "react";
import Map, { Source, Layer, type LayerProps } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router";
import type { TopPhotoBuilding } from "@/features/admin/types/admin";
import { getBuildingUrl } from "@/utils/url";
import { adminTableHeadClass } from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

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
      0,   "rgba(23,23,23,0)",
      0.25, "rgba(23,23,23,0.2)",
      0.5, "rgba(23,23,23,0.45)",
      0.75, "rgba(23,23,23,0.7)",
      1,   "rgba(23,23,23,0.95)"
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
    "circle-color": "rgb(23,23,23)",
    "circle-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 0.9],
    "circle-stroke-color": "#ffffff",
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
    <Card className="border-border-default shadow-none">
      <Tabs defaultValue="table">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border-default pb-4">
          <TabsList className="h-auto rounded-none border-0 bg-transparent p-0">
            <TabsTrigger
              value="table"
              className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              Top buildings
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              Heatmap
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="p-0">
          <TabsContent value="table" className="mt-0">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(adminTableHeadClass, "w-12 pl-6")}>#</TableHead>
                    <TableHead className={adminTableHeadClass}>Building</TableHead>
                    <TableHead className={adminTableHeadClass}>City</TableHead>
                    <TableHead className={adminTableHeadClass}>Country</TableHead>
                    <TableHead className={cn(adminTableHeadClass, "pr-6 text-right")}>Photos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell className="pl-6 text-text-secondary tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <Link
                          to={getBuildingUrl(b.id, b.slug ?? undefined)}
                          className="font-medium text-text-primary hover:underline"
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
            <div className="h-[500px] overflow-hidden rounded-b-sm">
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
