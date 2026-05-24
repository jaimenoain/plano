import { lazy, Suspense, useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import {
  fetchPhotoCoverageStats,
  fetchTopPhotoBuildings,
  fetchZeroPhotoBuildings,
} from "@/features/admin/api/admin";
import type { PhotoCoverageStats, TopPhotoBuilding, ZeroPhotoBuilding } from "@/features/admin/types/admin";
import { PhotoCoverageStatsRow } from "@/features/admin/components/PhotoCoverageStatsRow";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageHeader, AdminSectionLabel } from "@/features/admin/components/admin-ui";

const PhotoActivityZone = lazy(() =>
  import("@/features/admin/components/PhotoActivityZone").then((m) => ({ default: m.PhotoActivityZone })),
);
const ZeroPhotoBuildingsZone = lazy(() =>
  import("@/features/admin/components/ZeroPhotoBuildingsZone").then((m) => ({ default: m.ZeroPhotoBuildingsZone })),
);

const ZoneFallback = () => (
  <div className="space-y-3 rounded-sm border border-border-default p-4">
    <Skeleton className="h-10 w-full rounded-sm" />
    <Skeleton className="h-48 w-full rounded-sm" />
  </div>
);

export const meta: MetaFunction = () => [{ title: "Photo Analytics | Plano" }];

export default function PhotoAnalytics() {
  const [coverageStats, setCoverageStats] = useState<PhotoCoverageStats | null>(null);
  const [topBuildings, setTopBuildings] = useState<TopPhotoBuilding[]>([]);
  const [zeroBuildings, setZeroBuildings] = useState<ZeroPhotoBuilding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPhotoCoverageStats(),
      fetchTopPhotoBuildings(50),
      fetchZeroPhotoBuildings(500),
    ]).then(([stats, top, zero]) => {
      setCoverageStats(stats);
      setTopBuildings(top);
      setZeroBuildings(zero);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-9 w-64 rounded-sm" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-sm" />
          ))}
        </div>
        <ZoneFallback />
        <ZoneFallback />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Media"
        title="Photo Analytics"
        description="Coverage stats, top photographed buildings, and buildings still missing photos."
      />

      <PhotoCoverageStatsRow stats={coverageStats} />

      <section className="space-y-4">
        <AdminSectionLabel>Photo activity</AdminSectionLabel>
        <Suspense fallback={<ZoneFallback />}>
          <PhotoActivityZone data={topBuildings} />
        </Suspense>
      </section>

      <section className="space-y-4">
        <AdminSectionLabel>Buildings without photos</AdminSectionLabel>
        <Suspense fallback={<ZoneFallback />}>
          <ZeroPhotoBuildingsZone data={zeroBuildings} />
        </Suspense>
      </section>
    </div>
  );
}
