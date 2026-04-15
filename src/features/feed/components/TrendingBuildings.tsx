import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  slug: string | null;
  short_id: number | null;
  hero_image_url: string | null;
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
  hero_image_url: string | null;
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
    .select("id, name, city, country, slug, short_id, hero_image_url")
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
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
          Trending this week
        </h3>
        <Link
          to="/explore"
          className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors inline-flex items-center gap-1"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-2xl font-bold text-text-disabled w-6 shrink-0">{i + 1}</span>
                <Skeleton className="w-10 h-10 rounded-none flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))
          : buildings.length === 0
          ? (
            <p className="text-xs text-text-secondary">
              No trending data yet.
            </p>
          )
          : buildings.map((building, index) => {
              const imageUrl = getBuildingImageUrl(building.hero_image_url);
              // TODO: enrich DTO with locality fields
              const href = getBuildingUrl(building.id, building.slug, building.short_id);
              return (
                <Link
                  key={building.id}
                  to={href}
                  className="flex items-center gap-3 group"
                >
                  {/* Rank — large editorial number */}
                  <span className="text-2xl font-bold text-text-disabled w-6 shrink-0 text-center">
                    {index + 1}
                  </span>
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-none flex-shrink-0 overflow-hidden bg-surface-muted">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={building.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-muted" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate leading-tight group-hover:text-brand-primary transition-colors">
                      {building.name}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {[building.city, building.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </Link>
              );
            })}
      </div>
    </div>
  );
}