import { Link } from "react-router";
import { Bookmark, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingDots } from "@/components/ui/rating-dots";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface RecommendationInteraction {
  status: 'visited' | 'pending' | null;
  rating: number | null;
}

interface Recommendation {
  id: string;
  building: {
    id: string;
    short_id?: number | null;
    slug?: string | null;
    name: string;
    main_image_url: string | null;
    year_completed: number | null;
  };
  recommender: {
    username: string | null;
    avatar_url: string | null;
  };
  created_at: string;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  interaction: RecommendationInteraction;
  onDismiss: (id: string) => void;
  onRate: (building: Recommendation["building"]) => void;
  onWatchlist: (building: Recommendation["building"]) => void;
}

export function RecommendationCard({ recommendation, interaction, onDismiss, onRate, onWatchlist }: RecommendationCardProps) {
  const { building, recommender } = recommendation;
  const year_completed = building.year_completed;
  const imageUrl = getBuildingImageUrl(building.main_image_url);

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-300">
      <div className="group relative aspect-4/3 cursor-pointer overflow-hidden rounded-none bg-surface-muted">
        {/* Locality URL not available: Recommendation.building does not include locality_country_code/city_slug — requires recommendations query to join localities table */}
        <Link to={getBuildingUrl(building.id, building.slug, building.short_id)}>
            {imageUrl ? (
            <img
                src={imageUrl}
                alt={building.name}
                className="size-full object-cover transition-opacity duration-300 group-hover:opacity-85"
            />
            ) : (
            <div className="photo-placeholder size-full" data-label={building.name} />
            )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 pt-3">
        <div>
            {/* Locality URL not available: Recommendation.building does not include locality_country_code/city_slug — requires recommendations query to join localities table */}
            <Link to={getBuildingUrl(building.id, building.slug, building.short_id)} className="transition-opacity hover:opacity-60">
                 <h3 className="text-xl font-bold leading-tight tracking-tight line-clamp-2" title={building.name}>{building.name}</h3>
            </Link>
            <p className="text-xs text-text-disabled mt-1">
              {year_completed ?? "—"} • {formatDistanceToNow(new Date(recommendation.created_at))} ago
            </p>
        </div>

        {/* Recommender — an avatar is the only round element here */}
        <div className="flex items-center gap-2.5 py-1">
             <Avatar className="h-6 w-6">
                <AvatarImage src={recommender.avatar_url || undefined} />
                <AvatarFallback className="text-2xs">{recommender.username?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-text-secondary">
              From <span className="font-medium text-text-primary">{recommender.username}</span>
            </span>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-2">
          <TooltipProvider>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={interaction.rating ? "secondary" : "ghost"}
                  size={interaction.rating ? "default" : "icon"}
                  className={cn(
                    "h-8 w-full rounded-sm transition-colors",
                    interaction.rating
                      ? "bg-brand-secondary text-text-primary border border-border-default"
                      : "hover:bg-brand-primary hover:text-brand-primary-foreground",
                  )}
                  onClick={() => onRate(building)}
                >
                  {interaction.rating ? (
                    <RatingDots rating={interaction.rating} size="sm" />
                  ) : (
                    <span className="text-2xs font-medium uppercase tracking-widest">Rate</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{interaction.rating ? "Edit Review" : "Rate"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={interaction.status === "pending" ? "default" : "secondary"}
                  size="icon"
                  className={cn(
                    "h-8 w-full rounded-sm transition-colors",
                    interaction.status === "pending"
                      ? "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
                      : "hover:bg-brand-primary hover:text-brand-primary-foreground",
                  )}
                  onClick={() => onWatchlist(building)}
                >
                  <Bookmark
                    className={cn(
                      "h-4 w-4",
                      interaction.status === "pending" && "fill-brand-primary-foreground",
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add to Bucket List</p>
              </TooltipContent>
            </Tooltip>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-full rounded-sm hover:bg-feedback-destructive/20 hover:text-feedback-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                   <p>Delete</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Recommendation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this recommendation from {recommender.username}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDismiss(recommendation.id)} className="bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
