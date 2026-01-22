import { Link } from "react-router-dom";
import { Star, Bookmark, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { slugify, cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
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
  onRate: (building: any) => void;
  onWatchlist: (building: any) => void;
}

export function RecommendationCard({ recommendation, interaction, onDismiss, onRate, onWatchlist }: RecommendationCardProps) {
  const { building, recommender } = recommendation;
  const year_completed = building.year_completed;

  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
      <div className="relative aspect-[2/3] group cursor-pointer overflow-hidden">
        <Link to={`/building/${building.id}`}>
            {building.main_image_url ? (
            <img
                src={building.main_image_url}
                alt={building.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground p-4 text-center">
                {building.name}
            </div>
            )}
        </Link>
      </div>

      <div className="p-3 flex flex-col flex-1 gap-2">
        <div>
            <Link to={`/building/${building.id}`} className="hover:underline">
                 <h3 className="font-semibold leading-tight line-clamp-1" title={building.name}>{building.name}</h3>
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">{year_completed} • {formatDistanceToNow(new Date(recommendation.created_at))} ago</p>
        </div>

        {/* Recommender Info - More prominent in body */}
        <div className="flex items-center gap-3 bg-secondary/30 p-2 rounded-md my-1">
             <Avatar className="h-8 w-8">
                <AvatarImage src={recommender.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{recommender.username?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-xs text-muted-foreground leading-none">From</span>
                <span className="font-semibold text-sm leading-tight">{recommender.username}</span>
            </div>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2">
          <TooltipProvider>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={interaction.rating ? "default" : "secondary"}
                  size={interaction.rating ? "default" : "icon"}
                  className={cn("h-8 w-full rounded-md transition-colors", !interaction.rating && "hover:bg-primary hover:text-primary-foreground")}
                  onClick={() => onRate(building)}
                >
                  {interaction.rating ? (
                    <span className="flex items-center gap-1 font-bold"><Star className="h-3 w-3 fill-current" /> {interaction.rating}</span>
                  ) : (
                    <Star className="h-4 w-4" />
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
                  variant={interaction.status === 'pending' ? "default" : "secondary"}
                  size="icon"
                  className={cn("h-8 w-full rounded-md transition-colors",
                    interaction.status === 'pending' ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-primary hover:text-primary-foreground"
                  )}
                  onClick={() => onWatchlist(building)}
                >
                    <Bookmark className={cn("h-4 w-4", interaction.status === 'pending' && "fill-current")} />
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
                    <Button variant="ghost" size="icon" className="h-8 w-full rounded-md hover:bg-destructive/20 hover:text-destructive transition-colors">
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
                  <AlertDialogAction onClick={() => onDismiss(recommendation.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
