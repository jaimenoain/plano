import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Architect } from "@/types/architect";

interface InterestedUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface SmartBuilding {
  id: string;
  name: string;
  main_image_url: string | null;
  year_completed: number | null;
  architects: Architect[] | null;
  overlap_count: number;
  interested_users: InterestedUser[];
  total_selected_members: number;
}

interface SmartBuildingCardProps {
  building: SmartBuilding;
}

export function SmartBuildingCard({ building }: SmartBuildingCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const isInWatchlist = user && building.interested_users.some(u => u.id === user.id);

  const imageUrl = building.main_image_url || "/placeholder.svg";

  // Construct Link URL
  const linkUrl = `/building/${building.id}`;

  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

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
        const { error } = await supabase
          .from("user_buildings")
          .insert({
            user_id: user.id,
            building_id: building.id,
            status: "pending"
          });

        if (error) throw error;
        toast.success("Added to bucket list");
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["group-smart-backlog"] });
      queryClient.invalidateQueries({ queryKey: ["user-bucket-list-count"] });

    } catch (error) {
      console.error("Watchlist toggle error:", error);
      toast.error("Failed to update bucket list");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group relative flex flex-col space-y-2">
      <Link to={linkUrl} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted transition-all hover:scale-[1.02] hover:ring-2 hover:ring-primary/50 hover:shadow-lg">
        <img
          src={imageUrl}
          alt={building.name}
          className="h-full w-full object-cover transition-all"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

        {/* Watchlist Button */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            size="icon"
            variant={isInWatchlist ? "secondary" : "default"}
            className={`h-8 w-8 rounded-full shadow-lg transition-all ${
              isInWatchlist
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
            }`}
            onClick={handleToggleWatchlist}
            disabled={isLoading}
          >
            {isLoading ? (
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

        {/* Quick info on bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <h3 className="font-semibold leading-tight line-clamp-2 text-sm md:text-base drop-shadow-md">
            {building.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-white/80 mt-1">
             {building.architects && building.architects.length > 0 && (
                <span>{building.architects[0].name}</span>
             )}
             {building.architects && building.architects.length > 0 && building.year_completed && <span>•</span>}
             {building.year_completed && <span>{building.year_completed}</span>}
          </div>
        </div>
      </Link>

      {/* Interested Users Avatars */}
      {building.interested_users.length > 0 && (
        <div className="flex items-center -space-x-2 px-1">
          {building.interested_users.slice(0, 5).map((u) => (
             <Avatar key={u.id} className="h-6 w-6 border-2 border-background ring-1 ring-border">
                <AvatarImage src={u.avatar_url || undefined} />
                <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                    {u.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
             </Avatar>
          ))}
          {building.interested_users.length > 5 && (
             <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-muted-foreground ring-1 ring-border">
                +{building.interested_users.length - 5}
             </div>
          )}
        </div>
      )}
    </div>
  );
}
