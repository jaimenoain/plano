import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Bookmark, MapPin, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBuildingImageUrl } from "@/utils/image";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface BucketBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  slug: string | null;
  main_image_url: string | null;
  userBuildingId?: string;
}

interface BucketRow {
  id: string;
  building_id: string;
  building: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    slug: string | null;
    main_image_url: string | null;
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
        .select("id, building_id, building:buildings(id, name, city, country, slug, main_image_url)")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      const rows = (data ?? []) as unknown as BucketRow[];
      return rows
        .filter((r) => r.building !== null)
        .map((r) => ({
          ...(r.building as NonNullable<BucketRow["building"]>),
          userBuildingId: r.id,
        }));
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
    <div className="border border-border-default rounded-sm bg-surface-card shadow-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5 text-text-secondary" />
          Your bucket list
        </h3>
        <Link
          to="/profile"
          className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-0.5"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Items */}
      <div className="divide-y divide-border-default">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <Skeleton className="w-9 h-9 rounded-sm flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
              </div>
            ))
          : items.map((building) => {
              const imageUrl = getBuildingImageUrl(building.main_image_url);
              const href = `/building/${building.id}/${building.slug ?? "details"}`;
              return (
                <div
                  key={building.id}
                  className="flex items-center gap-3 px-4 py-2.5 group"
                >
                  {/* Thumbnail */}
                  <Link to={href} className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-sm overflow-hidden bg-surface-muted border border-border-default">
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
                  </Link>

                  {/* Info */}
                  <Link to={href} className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate leading-tight">
                      {building.name}
                    </p>
                    <p className="text-2xs text-text-secondary flex items-center gap-0.5 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">
                        {[building.city, building.country].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  </Link>

                  {/* Mark visited */}
                  <button
                    onClick={() => handleMarkVisited(building.id)}
                    title="Mark as visited"
                    className="flex-shrink-0 text-text-disabled hover:text-feedback-success transition-colors"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              );
            })}
      </div>
    </div>
  );
}