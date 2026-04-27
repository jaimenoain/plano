import { Camera, ImageIcon, ImageOff, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PhotoCoverageStats } from "@/features/admin/types/admin";

interface PhotoCoverageStatsRowProps {
  stats: PhotoCoverageStats | null;
}

export function PhotoCoverageStatsRow({ stats }: PhotoCoverageStatsRowProps) {
  const coverage = stats && stats.total_buildings > 0
    ? Math.round((stats.buildings_with_photos / stats.total_buildings) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
          <ImageIcon className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total_photos.toLocaleString() ?? "—"}</div>
          <p className="text-xs text-text-secondary">Across all buildings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Buildings with Photos</CardTitle>
          <Camera className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.buildings_with_photos.toLocaleString() ?? "—"}</div>
          <p className="text-xs text-text-secondary">Have at least one photo</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Buildings without Photos</CardTitle>
          <ImageOff className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.buildings_without_photos.toLocaleString() ?? "—"}</div>
          <p className="text-xs text-text-secondary">No photos yet</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coverage</CardTitle>
          <BarChart3 className="h-4 w-4 text-text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats ? `${coverage}%` : "—"}</div>
          <p className="text-xs text-text-secondary">Of buildings have photos</p>
        </CardContent>
      </Card>
    </div>
  );
}
