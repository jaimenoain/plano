import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { DiscoveryBuilding } from "./types";
import { cn } from "@/lib/utils";

interface DiscoveryBuildingCardProps {
  building: DiscoveryBuilding;
  socialContext?: string;
  distance?: number;
}

export function DiscoveryBuildingCard({
  building,
  socialContext,
  distance,
}: DiscoveryBuildingCardProps) {
  const imageUrl = building.main_image_url;

  return (
    <Link to={`/building/${building.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-md transition-shadow group">
        <div className="flex flex-row">
          {/* Content */}
          <div className="flex flex-col flex-1 p-3 justify-center">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {building.name}
              </h3>
            </div>

            <div className={cn("text-xs text-muted-foreground mt-1", imageUrl ? "line-clamp-2" : "line-clamp-1")}>
              <span>{building.architects?.[0] || "Unknown Architect"}</span>
              {building.year_completed && (
                <>
                  <span>{imageUrl ? " " : " • "}</span>
                  <span>{building.year_completed}</span>
                </>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {distance !== undefined && (
                <Badge variant="secondary" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto">
                  <MapPin className="h-3 w-3" />
                  {distance < 1
                    ? `${(distance * 1000).toFixed(0)}m away`
                    : `${distance.toFixed(1)}km away`}
                </Badge>
              )}
              {socialContext && (
                <Badge variant="secondary" className="flex items-center gap-1 font-normal bg-primary/10 text-primary hover:bg-primary/20 text-xs px-2 py-0.5 h-auto">
                  <Users className="h-3 w-3" />
                  {socialContext}
                </Badge>
              )}
            </div>
          </div>

          {/* Image */}
          {imageUrl && (
            <div className="w-32 h-32 relative shrink-0">
              <img
                src={imageUrl}
                alt={building.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
