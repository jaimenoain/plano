import { useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import {
  fetchPhotoCoverageStats,
  fetchTopPhotoBuildings,
  fetchZeroPhotoBuildings,
} from "@/features/admin/api/admin";
import type { PhotoCoverageStats, TopPhotoBuilding, ZeroPhotoBuilding } from "@/features/admin/types/admin";
import { PhotoCoverageStatsRow } from "@/features/admin/components/PhotoCoverageStatsRow";
import { PhotoActivityZone } from "@/features/admin/components/PhotoActivityZone";
import { ZeroPhotoBuildingsZone } from "@/features/admin/components/ZeroPhotoBuildingsZone";

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
        <PhotoActivityZone data={topBuildings} />
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Buildings Without Photos</h2>
        <ZeroPhotoBuildingsZone data={zeroBuildings} />
      </section>
    </div>
  );
}
