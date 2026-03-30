import { useEffect, useState } from "react";
import { fetchPhotoHeatmapData } from "@/api/admin";
import { HeatmapPoint } from "@/types/admin";
import { PhotoHeatmapZone } from "@/components/admin/PhotoHeatmapZone";
import { NoPhotosMapZone } from "@/components/admin/NoPhotosMapZone";
import { BottomNav } from "@/components/layout/BottomNav";

export default function PhotoAnalytics() {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchPhotoHeatmapData();
        setHeatmapData(data);
      } catch (error) {
        console.error("Failed to load photo analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Photo Analytics</h1>
        </div>

        <div className="space-y-4">
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
