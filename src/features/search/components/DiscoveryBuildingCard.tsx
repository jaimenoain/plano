import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { DiscoveryBuilding } from "./types";

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

            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {building.architects?.[0] || "Unknown Architect"}
              {building.year_completed && ` • ${building.year_completed}`}
            </p>

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

            {/* Facepile */}
            {building.contact_raters && building.contact_raters.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex -space-x-2">
                  {building.contact_raters.slice(0, 3).map((rater) => (
                    <Avatar key={rater.id} className="w-5 h-5 border border-background">
                      <AvatarImage src={rater.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{rater.first_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {building.contact_raters.length === 1 && building.contact_raters[0].first_name
                    ? `Rated by ${building.contact_raters[0].first_name}`
                    : `${building.contact_raters.length} contacts rated this`}
                </span>
              </div>
            )}
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
