import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { DiscoveryBuilding } from "./types";

interface DiscoveryBuildingCardProps {
  building: DiscoveryBuilding;
  socialContext?: string;
  distance?: number;
  onClick?: () => void;
}

export function DiscoveryBuildingCard({
  building,
  socialContext,
  distance,
  onClick,
}: DiscoveryBuildingCardProps) {
  const imageUrl = building.main_image_url || "/placeholder.svg";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-48 sm:h-48 aspect-square relative shrink-0">
            <img
            src={imageUrl}
            alt={building.name}
            className="w-full h-full object-cover"
            loading="lazy"
            />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4 justify-between">
            <div>
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                        {building.name}
                    </h3>
                </div>

                <p className="text-sm text-muted-foreground mt-1">
                    {building.architects?.[0] || "Unknown Architect"}
                    {building.year_completed && ` • ${building.year_completed}`}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {distance !== undefined && (
                        <Badge variant="secondary" className="flex items-center gap-1 font-normal">
                            <MapPin className="h-3 w-3" />
                            {distance < 1
                                ? `${(distance * 1000).toFixed(0)}m away`
                                : `${distance.toFixed(1)}km away`}
                        </Badge>
                    )}
                    {socialContext && (
                        <Badge variant="secondary" className="flex items-center gap-1 font-normal bg-primary/10 text-primary hover:bg-primary/20">
                            <Users className="h-3 w-3" />
                            {socialContext}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Action */}
            <div className="flex justify-end mt-4 sm:mt-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 hover:bg-transparent hover:underline p-0 h-auto font-medium text-primary"
                    onClick={onClick}
                >
                    View Details <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
    </Card>
  );
}
