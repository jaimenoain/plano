import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router";
import { FavoriteItem } from "./types";
import { getBuildingUrl } from "@/utils/url";
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
    <button
      type="button"
      className={cn("flex flex-col items-start gap-1 w-32 text-left group cursor-pointer", className)}
      onClick={onClick}
    >
      <div className="aspect-square w-full rounded-none overflow-hidden bg-surface-muted border border-border-default shadow-none">
        {fav.image_url ? (
          <img
            src={fav.image_url}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            alt={fav.title}
          />
        ) : (
          <div className="h-full w-full bg-surface-muted" />
        )}
      </div>
      <span className="text-xs font-medium text-text-primary truncate w-full">
        {fav.title}
      </span>
    </button>
  );
}

export function FavoritesSection({ favorites, isOwnProfile, onManage }: FavoritesSectionProps) {
  const navigate = useNavigate();

  if (favorites.length === 0) {
    if (!isOwnProfile) return null;

    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between border-t border-border-default pt-4 mb-4">
          <h3 className="text-xs font-medium tracking-widest uppercase text-text-secondary">All-time Favourites</h3>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="w-full border border-dashed border-border-default p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-muted/20 transition-colors group"
        >
          <p className="text-text-secondary group-hover:text-text-primary transition-colors">
            Add your top 6 favourite buildings
          </p>
          <span className="mt-2 text-xs font-medium uppercase tracking-widest text-text-disabled group-hover:text-text-secondary transition-colors">
            Add favourites →
          </span>
        </button>
      </div>
    );
  }

  const handleNavigate = (fav: FavoriteItem) => {
    if (fav.reviewId) {
      navigate(`/review/${fav.reviewId}`);
    } else {
      navigate(getBuildingUrl(String(fav.id)));
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between border-t border-border-default pt-4 mb-4">
        <h3 className="text-xs font-medium tracking-widest uppercase text-text-secondary">All-time Favourites</h3>
        {isOwnProfile && (
           <button onClick={onManage} className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">
             Edit →
           </button>
        )}
      </div>

      <div className="md:hidden relative group">
        <ScrollArea className="w-full whitespace-nowrap -mx-4 pb-4">
          <div className="flex space-x-4 px-4 pr-12">
            {favorites.map((fav) => (
              <FavoritePoster
                key={`${fav.media_type}-${fav.id}`}
                fav={fav}
                className="shrink-0"
                onClick={() => handleNavigate(fav)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
        <div className="absolute top-0 -right-4 bottom-4 w-12 bg-linear-to-l from-surface-default to-transparent pointer-events-none z-10" />
      </div>

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
