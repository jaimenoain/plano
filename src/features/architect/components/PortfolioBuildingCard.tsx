import { Link } from "react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
    <div className="group relative flex flex-col bg-surface-default">
      <Link
        to={linkUrl}
        className="relative aspect-[4/3] overflow-hidden bg-surface-muted"
      >
        <img
          src={imageUrl}
          alt={building.name}
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
          loading="lazy"
        />
      </Link>

      <div className="px-1 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={linkUrl}>
            <h3 className="text-sm font-semibold leading-tight line-clamp-2 text-text-primary">{building.name}</h3>
          </Link>
          <div className="flex items-center gap-1.5 text-2xs text-text-secondary mt-1">
            {building.architects && building.architects.length > 0 && <span>{building.architects[0].name}</span>}
            {building.architects && building.architects.length > 0 && building.year_completed && <span>·</span>}
            {building.year_completed && <span>{building.year_completed}</span>}
          </div>
        </div>

        {!hideBucketListButton && (
          <button
            onClick={handleToggleWatchlist}
            disabled={isMutating}
            className="shrink-0 mt-0.5 text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
          >
            {isMutating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isInWatchlist ? (
              "Saved"
            ) : (
              "Save"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
