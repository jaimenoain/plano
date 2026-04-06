import { useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import { fetchPhotoHeatmapData } from "@/features/admin/api/admin";
import { HeatmapPoint } from "@/features/admin/types/admin";
import { PhotoHeatmapZone } from "@/features/admin/components/PhotoHeatmapZone";
import { NoPhotosMapZone } from "@/features/admin/components/NoPhotosMapZone";
import { BottomNav } from "@/components/layout/BottomNav";

export const meta: MetaFunction = () => [{ title: "Photo Analytics | Plano" }];

export default function PhotoAnalytics() {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchPhotoHeatmapData();
        setHeatmapData(data);
      } catch (_error) {
} finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-text-secondary">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="space-y-8 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">Photo Analytics</h1>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <PhotoHeatmapZone data={heatmapData || []} />
          </section>

          <section className="space-y-4">
            <NoPhotosMapZone />
          </section>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
