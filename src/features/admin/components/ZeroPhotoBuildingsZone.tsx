import { useState, useMemo } from "react";
import Map, { Source, Layer, NavigationControl, type LayerProps, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AdminFormLabel, adminTableHeadClass } from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, useNavigate } from "react-router";
import type { ZeroPhotoBuilding } from "@/features/admin/types/admin";
import { getBuildingUrl } from "@/utils/url";

interface ZeroPhotoBuildingsZoneProps {
  data: ZeroPhotoBuilding[];
}

const CIRCLE_LAYER: LayerProps = {
  id: "zero-photos-circles",
  type: "circle",
  paint: {
    "circle-radius": 6,
    "circle-color": "#EF4444",
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 1,
    "circle-opacity": 0.8
  }
};

export function ZeroPhotoBuildingsZone({ data }: ZeroPhotoBuildingsZoneProps) {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [cursor, setCursor] = useState("auto");
  const navigate = useNavigate();

  const uniqueCountries = useMemo(
    () => [...new Set(data.map(b => b.country_code).filter((c): c is string => Boolean(c)))].sort(),
    [data]
  );

  const filtered = useMemo(() => {
    return data.filter(b => {
      const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
      const matchesCountry = countryFilter === "all" || b.country_code === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [data, search, countryFilter]);

  const geoJsonData = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: data.map(b => ({
      type: "Feature" as const,
      properties: { id: b.id, name: b.name, slug: b.slug },
      geometry: { type: "Point" as const, coordinates: [b.lng, b.lat] }
    }))
  }), [data]);

  const handleMapClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature) {
      const { id, slug } = feature.properties;
      navigate(getBuildingUrl(id, slug !== "null" ? slug : undefined));
    }
  };

  return (
    <Card className="border-border-default shadow-none">
      <CardHeader className="border-b border-border-default">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {filtered.length !== data.length
              ? `${filtered.length} of ${data.length} shown`
              : `${data.length} buildings`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <AdminFormLabel htmlFor="zero-photo-search">Search</AdminFormLabel>
            <Input
              id="zero-photo-search"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs rounded-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <AdminFormLabel>Country</AdminFormLabel>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {uniqueCountries.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>

        <div className="rounded-sm border border-border-default bg-surface-card max-h-72 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(adminTableHeadClass, "pl-4")}>Building</TableHead>
                <TableHead className={adminTableHeadClass}>City</TableHead>
                <TableHead className={adminTableHeadClass}>Country</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="pl-4 text-text-secondary">
                    No buildings match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="pl-4">
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="h-[400px] rounded-sm overflow-hidden border border-border-default">
          <Map
            initialViewState={{ latitude: 20, longitude: 0, zoom: 1.5 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="https://tiles.openfreemap.org/styles/positron"
            mapLib={maplibregl}
            attributionControl={false}
            interactiveLayerIds={["zero-photos-circles"]}
            onClick={handleMapClick}
            cursor={cursor}
            onMouseEnter={() => setCursor("pointer")}
            onMouseLeave={() => setCursor("auto")}
          >
            <NavigationControl position="top-right" />
            <Source type="geojson" data={geoJsonData}>
              <Layer {...CIRCLE_LAYER} />
            </Source>
          </Map>
        </div>
      </CardContent>
    </Card>
  );
}
