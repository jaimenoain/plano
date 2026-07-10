import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingDots } from "@/components/ui/rating-dots";
import { EyeOff, Medal } from "lucide-react";
import { Link } from "react-router";
import { DiscoveryBuilding, ContactInteraction } from "./types";
import { formatBuildingStatusForDisplay, isLostStatus } from "@/lib/buildingStatus";
import { cn } from "@/lib/utils";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl, getBuildingLocalityUrl } from "@/utils/url";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";

interface DiscoveryBuildingCardProps {
  building: DiscoveryBuilding;
  socialContext?: string;
  distance?: number;
  action?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  imagePosition?: 'left' | 'right';
  /** Narrow lists / modals: smaller title and thumbnail */
  variant?: 'default' | 'compact';
  target?: string;
}

export function DiscoveryBuildingCard({
  building,
  socialContext: _socialContext,
  distance: _distance,
  action,
  onClick,
  imagePosition = 'right',
  variant = 'default',
  target,
}: DiscoveryBuildingCardProps) {
  const compact = variant === 'compact';
  const rawThumb = building.main_image_url ?? building.hero_image_url ?? null;
  const imageUrl = getBuildingImageUrl(rawThumb);
  const { statuses, ratings } = useUserBuildingStatuses();
  const userStatus = statuses[building.id];
  const userRating = ratings[building.id];
  const isHidden = userStatus === 'ignored';

  const ImageComponent = imageUrl && (
    <div
      className={cn(
        // Imagery keeps radius-none at every size — the compact thumb was `rounded-md`.
        "relative shrink-0 overflow-hidden bg-surface-muted",
        compact ? "w-14 h-14" : "w-32 aspect-4/3",
      )}
    >
      <img
        src={imageUrl}
        alt={[building.name, building.city].filter(Boolean).join(", ")}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );

  const actionPositionClass = imagePosition === 'left' ? 'bottom-2 right-2' : 'top-2 right-2';

  // Kit `.serp-item`: an unboxed row separated by a single hairline, tinting on hover.
  // No border box, no fill, no shadow — content rows float.
  const Content = (
    <div
      data-testid="serp-row"
      className="group relative min-w-0 overflow-hidden border-b border-border-default transition-colors hover:bg-surface-muted"
    >
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
        <div
          className={cn(
            "flex flex-col flex-1 justify-center min-w-0",
            compact ? "p-2 pr-8" : "p-3 pr-6",
          )}
        >
          <div className="flex flex-col">
            {/* Kit `.serp-name` — 19px/700/−0.02em. `font-black` is weight 900; the
                system permits Inter 400–700 only. */}
            <h3
              className={cn(
                "line-clamp-2 group-hover:opacity-75 transition-opacity",
                compact
                  ? "text-sm font-semibold leading-snug text-text-primary"
                  : "text-xl font-bold leading-tight tracking-tight",
              )}
            >
              {building.name}
            </h3>
            {building.alt_name && building.alt_name !== building.name && (
              <span className="text-xs text-text-secondary line-clamp-1 italic">
                {building.alt_name}
              </span>
            )}
          </div>

          <div
            className={cn(
              "text-text-secondary mt-1",
              compact ? "text-2xs-plus leading-relaxed line-clamp-2" : "text-xs",
              !compact && (imageUrl ? "line-clamp-2" : "line-clamp-1"),
            )}
          >
            {building.city && (
              <>
                <span>{building.city}</span>
                <span> • </span>
              </>
            )}
            <span>{building.credits?.[0]?.name ?? "—"}</span>
            {building.year_completed && (
              <>
                <span> • </span>
                {/* Space Mono is reserved for tiny numeric meta — the year qualifies. */}
                <span className="meta-code">{building.year_completed}</span>
              </>
            )}
          </div>

          {/* Badges — status words removed. The award is earned-only dots, never a chip. */}
          <div className={cn("flex flex-wrap items-center gap-2", compact ? "mt-1.5" : "mt-2")}>
            {(userStatus === 'visited' || userStatus === 'pending') && (
              <RatingDots rating={userRating} size="sm" />
            )}
            {(building.status === 'Unbuilt' || isLostStatus(building.status)) && (
              <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto text-text-secondary border-text-secondary/30 max-w-full truncate">
                {building.status === 'Unbuilt' ? 'Unbuilt' : formatBuildingStatusForDisplay(building.status!)}
              </Badge>
            )}
            {isHidden && (
              <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs px-2 py-0.5 h-auto text-text-secondary border-dashed max-w-full truncate">
                <EyeOff className="h-3 w-3" />
                Hidden
              </Badge>
            )}
            {building.winner_award_name && (
              // Monochrome: `amber-500/600` were raw palette colours, and the system
              // carries no chromatic accent for awards. Flat, hairline, no shadow.
              <Badge variant="outline" className="flex items-center gap-1 font-medium text-2xs uppercase tracking-widest px-2 py-0.5 h-auto text-text-primary border-border-default max-w-full truncate">
                <Medal className="h-3 w-3 shrink-0" />
                {building.winner_award_name}
              </Badge>
            )}
          </div>

          {/* Unified Interactions Facepile */}
          {building.contact_interactions && building.contact_interactions.length > 0 && (() => {
            const sortedInteractions = [...building.contact_interactions].sort((a, b) => {
              const aHasAvatar = !!a.user.avatar_url;
              const bHasAvatar = !!b.user.avatar_url;
              if (aHasAvatar && !bHasAvatar) return -1;
              if (!aHasAvatar && bHasAvatar) return 1;
              return 0;
            });

            return (
              <div className="flex items-center gap-2 mt-2 min-w-0">
                <div className="flex -space-x-2 shrink-0">
                  {sortedInteractions.slice(0, 3).map((interaction) => (
                    <Avatar key={interaction.user.id} className="w-5 h-5 border border-surface-default">
                      <AvatarImage src={interaction.user.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{interaction.user.username?.[0] || interaction.user.first_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-xs text-text-secondary truncate">
                  {getInteractionText(sortedInteractions)}
                </span>
              </div>
            );
          })()}
        </div>

        {imagePosition === 'right' && ImageComponent}
      </div>
    </div>
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
      to={
        building.locality_country_code && building.locality_city_slug
          ? getBuildingLocalityUrl(building.locality_country_code, building.locality_city_slug, building.id, building.slug, building.short_id)
          : getBuildingUrl(building.id, building.slug, building.short_id)
      }
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
