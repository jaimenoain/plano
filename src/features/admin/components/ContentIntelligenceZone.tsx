import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/types/admin";
import { getBuildingImageUrl } from "@/utils/image";

interface ContentIntelligenceZoneProps {
  trendingBuildings: DashboardStats['content_intelligence']['trending_buildings'];
}

export function ContentIntelligenceZone({ trendingBuildings }: ContentIntelligenceZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trending Buildings (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {trendingBuildings.map((building) => {
            const imageUrl = getBuildingImageUrl(building.main_image_url);
            return (
            <div key={building.building_id} className="flex flex-col items-center text-center space-y-2">
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={building.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none line-clamp-2">{building.name}</p>
                <p className="text-xs text-muted-foreground">{building.visit_count} interactions</p>
              </div>
            </div>
          )})}
        </div>
      </CardContent>
    </Card>
  );
}
