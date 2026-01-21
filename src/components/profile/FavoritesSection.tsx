import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { FavoriteItem } from "./types";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface FavoritesSectionProps {
  favorites: FavoriteItem[];
  isOwnProfile: boolean;
  onManage: () => void;
}

interface FavoritePosterProps {
  fav: FavoriteItem;
  className?: string;
  onClick: () => void;
}

function FavoritePoster({ fav, className, onClick }: FavoritePosterProps) {
  return (
    <div
      className={cn(
        "aspect-[2/3] rounded-lg overflow-hidden bg-secondary shadow-lg hover:shadow-xl transition-all relative group cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <img
        src={`https://image.tmdb.org/t/p/w400${fav.poster_path}`}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        alt={fav.title}
      />
    </div>
  );
}

export function FavoritesSection({ favorites, isOwnProfile, onManage }: FavoritesSectionProps) {
  const navigate = useNavigate();

  if (favorites.length === 0) {
    if (!isOwnProfile) return null;

    return (
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-4 w-4 text-primary fill-primary" />
          <h3 className="text-sm font-semibold text-foreground">All-time Favourites</h3>
        </div>
        <div
          onClick={onManage}
          className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/20 transition-colors group"
        >
          <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-muted-foreground font-medium group-hover:text-foreground transition-colors">
            Add here your top 6 favourite buildings
          </p>
        </div>
      </div>
    );
  }

  const handleNavigate = (fav: FavoriteItem) => {
    const slug = slugify(fav.title);
    if (fav.reviewId) {
      navigate(`/review/${fav.reviewId}`);
    } else {
      navigate(`/${fav.media_type}/${slug}/${fav.id}`);
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary fill-primary" />
          <h3 className="text-sm font-semibold text-foreground">All-time Favourites</h3>
        </div>
        {isOwnProfile && (
           <Button variant="ghost" size="sm" onClick={onManage} className="text-xs h-auto p-0 text-muted-foreground hover:text-primary">
             Edit
           </Button>
        )}
      </div>

      {/* Mobile View: ScrollArea */}
      <div className="md:hidden relative group">
        <ScrollArea className="w-full whitespace-nowrap -mx-4 pb-4">
          <div className="flex space-x-4 px-4 pr-12">
            {favorites.map((fav) => (
              <FavoritePoster
                key={`${fav.media_type}-${fav.id}`}
                fav={fav}
                className="w-[140px] shrink-0"
                onClick={() => handleNavigate(fav)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
        {/* Gradient hint on the right */}
        <div className="absolute top-0 right-[-1rem] bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      </div>

      {/* Desktop View: Grid */}
      <div className="hidden md:grid grid-cols-6 gap-4">
        {favorites.map((fav) => (
          <FavoritePoster
            key={`${fav.media_type}-${fav.id}`}
            fav={fav}
            className="w-full"
            onClick={() => handleNavigate(fav)}
          />
        ))}
      </div>
    </div>
  );
}
