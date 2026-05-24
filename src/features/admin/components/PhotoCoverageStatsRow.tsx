import { Camera, ImageIcon, ImageOff, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PhotoCoverageStats } from "@/features/admin/types/admin";

interface PhotoCoverageStatsRowProps {
  stats: PhotoCoverageStats | null;
}

const statCardClass = "border-border-default shadow-none";

export function PhotoCoverageStatsRow({ stats }: PhotoCoverageStatsRowProps) {
  const coverage = stats && stats.total_buildings > 0
    ? Math.round((stats.buildings_with_photos / stats.total_buildings) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className={statCardClass}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Total photos</CardTitle>
          <ImageIcon className="h-4 w-4 text-text-secondary" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text-primary">{stats?.total_photos.toLocaleString() ?? "—"}</div>
          <p className="text-xs text-text-secondary">Across all buildings</p>
        </CardContent>
      </Card>

      <Card className={statCardClass}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">With photos</CardTitle>
          <Camera className="h-4 w-4 text-text-secondary" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text-primary">{stats?.buildings_with_photos.toLocaleString() ?? "—"}</div>
          <p className="text-xs text-text-secondary">Have at least one photo</p>
        </CardContent>
      </Card>

      <Card className={statCardClass}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Without photos</CardTitle>
          <ImageOff className="h-4 w-4 text-text-secondary" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text-primary">{stats?.buildings_without_photos.toLocaleString() ?? "—"}</div>
          <p className="text-xs text-text-secondary">No photos yet</p>
        </CardContent>
      </Card>

      <Card className={statCardClass}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Coverage</CardTitle>
          <BarChart3 className="h-4 w-4 text-text-secondary" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text-primary">{stats ? `${coverage}%` : "—"}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-text-primary transition-all"
              style={{ width: stats ? `${coverage}%` : "0%" }}
            />
          </div>
          <p className="mt-1 text-xs text-text-secondary">Of buildings have photos</p>
        </CardContent>
      </Card>
    </div>
  );
}
