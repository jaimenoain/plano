import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Flame, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBuildingImageUrl } from "@/utils/image";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  slug: string | null;
  short_id: number | null;
  main_image_url: string | null;
  visitCount: number;
}

interface UserBuildingRow {
  building_id: string;
}

interface BuildingRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  slug: string | null;
  short_id: number | null;
  main_image_url: string | null;
}

async function fetchTrendingBuildings(): Promise<TrendingBuilding[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Step 1: fetch recent visits (status="visited" in last 7 days)
  const { data: visitRows, error: visitError } = await supabase
    .from("user_buildings")
    .select("building_id")
    .eq("status", "visited")
    .gte("updated_at", sevenDaysAgo)
    .limit(200);

  if (visitError) throw visitError;
  const rows = (visitRows ?? []) as unknown as UserBuildingRow[];

  // Step 2: count by building_id client-side
  const countMap: Record<string, number> = {};
  for (const row of rows) {
    countMap[row.building_id] = (countMap[row.building_id] ?? 0) + 1;
  }

  const topIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  // Step 3: fetch building details for the top IDs
  const { data: buildingRows, error: buildingError } = await supabase
    .from("buildings")
    .select("id, name, city, country, slug, short_id, main_image_url")
    .in("id", topIds);

  if (buildingError) throw buildingError;

  const buildings = (buildingRows ?? []) as unknown as BuildingRow[];

  // Preserve the ranking order from countMap
  return topIds
    .map((id) => {
      const b = buildings.find((bld) => bld.id === id);
      if (!b) return null;
      return { ...b, visitCount: countMap[id] ?? 0 };
    })
    .filter((b): b is TrendingBuilding => b !== null);
}

export function TrendingBuildings() {
  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["trending-buildings"],
    queryFn: fetchTrendingBuildings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return (
    <div className="p-0 border border-border-default rounded-sm bg-surface-card shadow-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-brand-primary" />
          Trending this week
        </h3>
        <Link
          to="/explore"
          className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-0.5"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* List */}
      <div className="divide-y divide-border-default">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-4 text-center text-xs font-bold text-text-disabled">{i + 1}</span>
                <Skeleton className="w-9 h-9 rounded-sm flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))
          : buildings.length === 0
          ? (
            <p className="px-4 py-4 text-xs text-text-secondary italic">
              No trending data yet — check back soon.
            </p>
          )
          : buildings.map((building, index) => {
              const imageUrl = getBuildingImageUrl(building.main_image_url);
              const href = `/building/${building.id}/${building.slug ?? "details"}`;
              return (
                <Link
                  key={building.id}
                  to={href}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted transition-colors group"
                >
                  {/* Rank */}
                  <span className="w-4 text-center text-xs font-bold text-text-disabled flex-shrink-0">
                    {index + 1}
                  </span>
                  {/* Thumbnail */}
                  <div className="w-9 h-9 rounded-sm flex-shrink-0 overflow-hidden bg-surface-muted border border-border-default">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={building.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-muted" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate leading-tight">
                      {building.name}
                    </p>
                    <p className="text-2xs text-text-secondary flex items-center gap-0.5 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">
                        {[building.city, building.country].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  </div>
                  {/* Visit count badge */}
                  <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-brand-secondary text-brand-secondary-foreground flex-shrink-0">
                    {building.visitCount}
                  </span>
                </Link>
              );
            })}
      </div>
    </div>
  );
}