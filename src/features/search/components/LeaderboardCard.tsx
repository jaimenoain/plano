import { LeaderboardBuilding } from "./types";
import { cn } from "@/lib/utils";
import { Eye, Star, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBuildingImageUrl } from "@/utils/image";

interface LeaderboardCardProps {
  building: LeaderboardBuilding;
  rank: number;
  type: "visited" | "rated";
}

export function LeaderboardCard({ building, rank, type }: LeaderboardCardProps) {
  const navigate = useNavigate();
  const imageUrl = getBuildingImageUrl(building.main_image_url) || "/placeholder.svg";

  return (
    <div
      className="group flex items-center gap-4 p-4 border-b border-border-default hover:bg-brand-secondary transition-colors cursor-pointer"
      onClick={() => navigate(`/building/${building.id}`)}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0",
        rank <= 3 ? "bg-brand-primary text-brand-primary-foreground" : "bg-surface-muted text-text-secondary"
      )}>
        #{rank}
      </div>

      <div className="h-12 w-12 rounded-md overflow-hidden shrink-0 border border-border-default/50">
        <img
          src={imageUrl}
          alt={building.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate group-hover:text-brand-primary transition-colors">
          {building.name}
        </h4>
        <div className="flex items-center text-xs text-text-secondary gap-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">
            {building.city || "Unknown City"}
            {building.country ? `, ${building.country}` : ""}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0">
        {type === "visited" ? (
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-1 font-semibold">
                <Eye className="h-3.5 w-3.5 text-text-secondary" />
                <span>{building.visit_count || 0}</span>
             </div>
             <span className="text-[10px] text-text-secondary">visits</span>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-semibold text-feedback-warning">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{building.avg_rating || 0}</span>
            </div>
            <span className="text-[10px] text-text-secondary">
                ({building.rating_count} votes)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
