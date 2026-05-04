import { lazy, Suspense, useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import {
  fetchPhotoCoverageStats,
  fetchTopPhotoBuildings,
  fetchZeroPhotoBuildings,
} from "@/features/admin/api/admin";
import type { PhotoCoverageStats, TopPhotoBuilding, ZeroPhotoBuilding } from "@/features/admin/types/admin";
import { PhotoCoverageStatsRow } from "@/features/admin/components/PhotoCoverageStatsRow";

const PhotoActivityZone = lazy(() =>
  import("@/features/admin/components/PhotoActivityZone").then((m) => ({ default: m.PhotoActivityZone })),
);
const ZeroPhotoBuildingsZone = lazy(() =>
  import("@/features/admin/components/ZeroPhotoBuildingsZone").then((m) => ({ default: m.ZeroPhotoBuildingsZone })),
);

const ZoneFallback = () => <div className="h-64 bg-surface-muted/30" />;

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-text-secondary">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight text-text-primary">Photo Analytics</h1>

      <PhotoCoverageStatsRow stats={coverageStats} />

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Photo Activity</h2>
        <Suspense fallback={<ZoneFallback />}>
          <PhotoActivityZone data={topBuildings} />
        </Suspense>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Buildings Without Photos</h2>
        <Suspense fallback={<ZoneFallback />}>
          <ZeroPhotoBuildingsZone data={zeroBuildings} />
        </Suspense>
      </section>
    </div>
  );
}
