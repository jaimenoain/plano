import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface BucketBuilding {
  id: string;
  short_id: number | null;
  name: string;
  city: string | null;
  country: string | null;
  slug: string | null;
  hero_image_url: string | null;
  userBuildingId?: string;
  locality_country_code?: string | null;
  locality_city_slug?: string | null;
}

interface BucketRow {
  id: string;
  building_id: string;
  building: {
    id: string;
    short_id: number | null;
    name: string;
    city: string | null;
    country: string | null;
    slug: string | null;
    hero_image_url: string | null;
    locality: { country_code: string; city_slug: string } | null;
  } | null;
}

export function BucketListWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["bucket-list-widget", user?.id],
    queryFn: async (): Promise<BucketBuilding[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_buildings")
        .select("id, building_id, building:buildings(id, short_id, name, city, country, slug, hero_image_url, locality:localities(country_code, city_slug))")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      const rows = (data ?? []) as unknown as BucketRow[];
      return rows
        .filter((r) => r.building !== null)
        .map((r) => {
          const b = r.building as NonNullable<BucketRow["building"]>;
          return {
            ...b,
            userBuildingId: r.id,
            locality_country_code: b.locality?.country_code ?? null,
            locality_city_slug: b.locality?.city_slug ?? null,
          };
        });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const handleMarkVisited = async (buildingId: string) => {
    if (!user) return;
    // Optimistic remove from list
    queryClient.setQueryData<BucketBuilding[]>(
      ["bucket-list-widget", user.id],
      (prev) => (prev ?? []).filter((b) => b.id !== buildingId)
    );
    try {
      const { error } = await supabase
        .from("user_buildings")
        .update({ status: "visited", updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("building_id", buildingId);
      if (error) throw error;
      toast.success("Marked as visited!");
      // Invalidate related queries so profile + feed stay in sync
      void queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
    } catch {
      // Revert on failure
      void queryClient.invalidateQueries({ queryKey: ["bucket-list-widget", user?.id] });
      toast.error("Couldn't update — please try again.");
    }
  };

  // Don't render for logged-out users or when the bucket list is empty
  if (!user) return null;
  if (!isLoading && items.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
          Your bucket list
        </h3>
        <Link
          to="/profile"
          className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors inline-flex items-center gap-1"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-none flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))
          : items.map((building) => {
              const imageUrl = getBuildingImageUrl(building.hero_image_url);
              const href =
                building.locality_country_code && building.locality_city_slug
                  ? getBuildingLocalityUrl(building.locality_country_code, building.locality_city_slug, building.id, building.slug, building.short_id)
                  : getBuildingUrl(building.id, building.slug, building.short_id);
              return (
                <div
                  key={building.id}
                  className="flex items-center gap-3 group"
                >
                  {/* Thumbnail */}
                  <Link to={href} className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-none overflow-hidden bg-surface-muted">
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
                  </Link>

                  {/* Info */}
                  <Link to={href} className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate leading-tight group-hover:text-brand-primary transition-colors">
                      {building.name}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {[building.city, building.country].filter(Boolean).join(", ")}
                    </p>
                  </Link>

                  {/* Mark visited */}
                  <button
                    onClick={() => handleMarkVisited(building.id)}
                    title="Mark as visited"
                    className="flex-shrink-0 text-text-disabled hover:text-feedback-success transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
      </div>
    </div>
  );
}