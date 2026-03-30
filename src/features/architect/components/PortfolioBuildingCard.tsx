import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Architect } from "@/features/architect/types";
import { getBuildingImageUrl } from "@/utils/image";
import { useAuth } from "@/features/auth/hooks/useAuth";

export interface PortfolioBuildingDisplay {
  id: string;
  name: string;
  main_image_url: string | null;
  year_completed: number | null;
  architects: Architect[] | null;
}

interface PortfolioBuildingCardProps {
  building: PortfolioBuildingDisplay;
  hideBucketListButton?: boolean;
}

export function PortfolioBuildingCard({ building, hideBucketListButton }: PortfolioBuildingCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState(false);

  const { data: isInWatchlist = false } = useQuery({
    queryKey: ["user-building-pending", user?.id, building.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_buildings")
        .select("id")
        .eq("user_id", user.id)
        .eq("building_id", building.id)
        .eq("status", "pending")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !hideBucketListButton,
  });

  const imageUrl = getBuildingImageUrl(building.main_image_url) || "/placeholder.svg";
  const linkUrl = `/building/${building.id}`;

  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (isMutating) return;
    setIsMutating(true);

    try {
      if (isInWatchlist) {
        const { error } = await supabase
          .from("user_buildings")
          .delete()
          .eq("user_id", user.id)
          .eq("building_id", building.id)
          .eq("status", "pending");

        if (error) throw error;
        toast.success("Removed from bucket list");
      } else {
        const { error } = await supabase.from("user_buildings").insert({
          user_id: user.id,
          building_id: building.id,
          status: "pending",
        });

        if (error) throw error;
        toast.success("Added to bucket list");
      }

      queryClient.invalidateQueries({ queryKey: ["user-building-pending", user.id, building.id] });
      queryClient.invalidateQueries({ queryKey: ["user-bucket-list-count"] });
    } catch {
      toast.error("Failed to update bucket list");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="group relative flex flex-col space-y-2">
      <Link
        to={linkUrl}
        className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-muted transition-all hover:scale-[1.02] hover:ring-2 hover:ring-brand-primary/50 shadow-none"
      >
        <img
          src={imageUrl}
          alt={building.name}
          className="h-full w-full object-cover transition-all"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

        {!hideBucketListButton && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              size="icon"
              variant={isInWatchlist ? "secondary" : "default"}
              className={`h-8 w-8 rounded-full shadow-lg transition-all ${
                isInWatchlist
                  ? "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
                  : "bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
              }`}
              onClick={handleToggleWatchlist}
              disabled={isMutating}
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isInWatchlist ? (
                <Clock className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isInWatchlist ? "Remove from bucket list" : "Add to bucket list"}
              </span>
            </Button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <h3 className="font-semibold leading-tight line-clamp-2 text-sm md:text-base drop-shadow-md">{building.name}</h3>
          <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
            {building.architects && building.architects.length > 0 && <span>{building.architects[0].name}</span>}
            {building.architects && building.architects.length > 0 && building.year_completed && <span>•</span>}
            {building.year_completed && <span>{building.year_completed}</span>}
          </div>
        </div>
      </Link>
    </div>
  );
}
