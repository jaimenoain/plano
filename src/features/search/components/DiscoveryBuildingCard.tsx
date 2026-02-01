import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Users, EyeOff, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { DiscoveryBuilding, ContactInteraction } from "./types";
import { cn } from "@/lib/utils";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { useUserBuildingStatuses } from "@/hooks/useUserBuildingStatuses";

interface DiscoveryBuildingCardProps {
  building: DiscoveryBuilding;
  socialContext?: string;
  distance?: number;
  action?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  imagePosition?: 'left' | 'right';
  target?: string;
}

export function DiscoveryBuildingCard({
  building,
  socialContext,
  distance,
  action,
  onClick,
  imagePosition = 'right',
  target,
}: DiscoveryBuildingCardProps) {
  const imageUrl = getBuildingImageUrl(building.main_image_url);
  const { statuses, ratings } = useUserBuildingStatuses();
  const userStatus = statuses[building.id];
  const userRating = ratings[building.id];
  const isHidden = userStatus === 'ignored';

  const ImageComponent = imageUrl && (
    <div className="w-32 h-32 relative shrink-0">
      <img
        src={imageUrl}
        alt={building.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );

  const actionPositionClass = imagePosition === 'left' ? 'bottom-2 right-2' : 'top-2 right-2';

  const Content = (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group relative">
      {action && (
        <div
          className={cn("absolute z-10", actionPositionClass)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {action}
        </div>
      )}
      <div className="flex flex-row">
        {imagePosition === 'left' && ImageComponent}

        {/* Content */}
        <div className="flex flex-col flex-1 p-3 justify-center">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors pr-6">
              {building.name}
            </h3>
          </div>

          <div className={cn("text-xs text-muted-foreground mt-1", imageUrl ? "line-clamp-2" : "line-clamp-1")}>
            <span>{building.architects?.[0]?.name || "Unknown Architect"}</span>
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
            {(userStatus === 'visited' || userStatus === 'pending') && (
              <Badge variant="secondary" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border">
                {userStatus === 'visited' ? "Visited" : "Saved"}
                {userRating && userRating > 0 && (
                   <div className="flex gap-0.5 ml-1">
                      {Array.from({ length: userRating }).map((_, i) => (
                         <Circle key={i} className="w-2 h-2 fill-current" />
                      ))}
                   </div>
                )}
              </Badge>
            )}
            {socialContext && (!building.contact_visitors || building.contact_visitors.length === 0) && (
              <Badge variant="secondary" className="flex items-center gap-1 font-normal bg-primary/10 text-primary hover:bg-primary/20 text-xs px-2 py-0.5 h-auto">
                <Users className="h-3 w-3" />
                {socialContext}
              </Badge>
            )}
            {(building.status === 'Demolished' || building.status === 'Unbuilt') && (
              <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto text-muted-foreground border-muted-foreground/30">
                {building.status}
              </Badge>
            )}
            {isHidden && (
              <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto text-muted-foreground border-dashed">
                <EyeOff className="h-3 w-3" />
                Hidden
              </Badge>
            )}
          </div>

          {/* Unified Interactions Facepile */}
          {building.contact_interactions && building.contact_interactions.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex -space-x-2">
                {building.contact_interactions.slice(0, 3).map((interaction) => (
                  <Avatar key={interaction.user.id} className="w-5 h-5 border border-background">
                    <AvatarImage src={interaction.user.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">{interaction.user.username?.[0] || interaction.user.first_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {getInteractionText(building.contact_interactions)}
              </span>
            </div>
          )}
        </div>

        {imagePosition === 'right' && ImageComponent}
      </div>
    </Card>
  );

  if (onClick) {
    return (
      <div onClick={onClick} className="block cursor-pointer">
        {Content}
      </div>
    );
  }

  return (
    <Link
      to={getBuildingUrl(building.id, building.slug, building.short_id)}
      className="block"
      target={target}
    >
      {Content}
    </Link>
  );
}

function getInteractionText(interactions: ContactInteraction[]) {
  if (interactions.length === 0) return "";

  const getAction = (i: ContactInteraction) => {
    const hasRating = i.rating !== null && i.rating > 0;
    const isSaved = i.status === 'pending';
    const isVisited = i.status === 'visited';

    if (hasRating && isSaved) return "Prioritised";
    if (hasRating) return "Recommended";
    if (isSaved) return "Saved";
    if (isVisited) return "Visited";
    return "Interacted";
  };

  if (interactions.length === 1) {
    const i = interactions[0];
    const name = i.user.username || i.user.first_name || "Friend";
    const action = getAction(i);
    return `${action} by ${name}`;
  }

  const actions = interactions.map(getAction);
  const uniqueActions = Array.from(new Set(actions));

  if (uniqueActions.length === 1) {
    const action = uniqueActions[0];
    const firstUser = interactions[0].user.username || interactions[0].user.first_name || "Friend";
    return `${action} by ${firstUser} +${interactions.length - 1}`;
  }

  // Priority: Prioritised > Recommended > Saved > Visited
  const priority: Record<string, number> = {
    "Prioritised": 4,
    "Recommended": 3,
    "Saved": 2,
    "Visited": 1,
    "Interacted": 0
  };

  const sortedActions = uniqueActions.sort((a, b) => (priority[b] || 0) - (priority[a] || 0));
  return sortedActions.slice(0, 2).join(" and ");
}
