import { Heart, MessageCircle, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { slugify } from "@/lib/utils";

interface ReviewCardProps {
  entry: {
    id: string; 
    content: string | null;
    rating: number | null;
    tags?: string[] | null;
    created_at: string;
    edited_at?: string | null;
    status?: string;
    user: {
      username: string | null;
      avatar_url: string | null;
    };
    building: {
      id: string;
      name: string;
      main_image_url: string | null;
      address?: string | null;
      architects?: string[] | null;
      year_completed?: number | null;
    };
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    watch_with_users?: { id: string, avatar_url: string | null, username: string | null }[];
    images?: {
      id: string;
      url: string;
      likes_count: number;
      is_liked: boolean;
    }[];
  };
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
  isDetailView?: boolean;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
}

export function ReviewCard({ 
  entry,
  onLike,
  onImageLike,
  onComment, 
  isDetailView = false, 
  hideUser = false,
  hideBuildingInfo = false
}: ReviewCardProps) {
  const navigate = useNavigate();
  
  // FIXED: Safety Check - Prevent crash if building data is missing
  if (!entry.building) return null;

  const posterUrl = entry.building.main_image_url || null;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDetailView) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    if (entry.building.id) {
        navigate(`/building/${entry.building.id}`);
    } else {
        navigate(`/review/${entry.id}`);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComment) {
        onComment(entry.id);
    } else {
        if (entry.building.id) {
            navigate(`/building/${entry.building.id}`);
        } else {
            navigate(`/review/${entry.id}`);
        }
    }
  };

  // Safe user access
  const username = entry.user?.username || "Unknown User";
  const avatarUrl = entry.user?.avatar_url || undefined;
  const userInitial = username.charAt(0).toUpperCase();

  // Title Logic
  const mainTitle = entry.building.name;

  // Metadata Logic: Architect • Year, fallback to Address
  const architects = entry.building.architects;
  const year_completed = entry.building.year_completed;

  let subTitle = entry.building.address;

  const architectsList = (architects || []).slice(0, 2).join(", ");

  if (architectsList) {
      subTitle = architectsList;
      if (year_completed) {
          subTitle += ` • ${year_completed}`;
      }
  } else if (year_completed) {
      subTitle = `${year_completed}`;
      if (entry.building.address) {
           subTitle += ` • ${entry.building.address}`;
      }
  }

  const isWatchlist = entry.status === 'pending';
  const watchWithUsers = entry.watch_with_users || [];

  // --- 1. DETAIL VIEW (List View) ---
  if (isDetailView) {
    return (
      <article className="px-4 py-4 hairline">
        {!hideUser ? (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-secondary text-foreground text-sm">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {username}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace("about ", "")}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-3">
             <p className="text-xs text-muted-foreground">
               {formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace("about ", "")}
             </p>
          </div>
        )}

        <div className="flex gap-3">
          {!hideBuildingInfo && (
            posterUrl ? (
              <img
                src={posterUrl}
                alt={entry.building.name}
                className="w-32 h-24 object-cover rounded-sm flex-shrink-0"
              />
            ) : (
              <div className="w-32 h-24 bg-secondary rounded-sm flex-shrink-0 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No image</span>
              </div>
            )
          )}

          <div className="flex-1 min-w-0">
            {!hideBuildingInfo && (
              <div className="mb-2">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {mainTitle}
                </h3>
                {subTitle && (
                  <p className="text-xs text-muted-foreground truncate">{subTitle}</p>
                )}
              </div>
            )}
            
            {entry.rating && (
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < entry.rating!
                        ? "fill-yellow-500 text-yellow-500"
                        : "fill-transparent text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}

            {entry.content && (
              <p className="text-sm text-muted-foreground mb-2">
                {entry.content}
              </p>
            )}

            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {entry.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs px-2 h-6 font-normal text-muted-foreground">
                    {tag}
                  </Badge>
                ))}
                {entry.tags.length > 3 && (
                   <span className="text-xs text-muted-foreground self-center">+{entry.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-3 pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(entry.id);
              window.dispatchEvent(new CustomEvent('pwa-interaction'));
            }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart
              className={`h-4 w-4 ${
                entry.is_liked ? "fill-primary text-primary" : ""
              }`}
            />
            <span className="text-xs">{entry.likes_count}</span>
          </button>
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{entry.comments_count}</span>
          </button>
        </div>
      </article>
    );
  }

  // --- 2. GRID VIEW (Social Layout Final) ---
  return (
    <article 
      onClick={handleCardClick}
      className="group relative flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      {/* 1. Header: User Info - UX IMPROVED */}
      {!hideUser && (
        <div className="p-1.5 md:p-3 flex items-center gap-1.5 md:gap-3 border-b border-border/40 bg-muted/20">
          <Avatar className="h-10 w-10 md:h-12 md:w-12 border border-border/50 shadow-sm">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-base md:text-lg font-bold bg-primary/10 text-primary">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-base md:text-lg font-bold text-foreground leading-tight truncate">
              {username}
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
            </span>
          </div>
        </div>
      )}

      {/* 2. Images Gallery or Poster Image */}
      {!hideBuildingInfo && (
        entry.images && entry.images.length > 0 ? (
          <div className="relative w-full overflow-hidden bg-secondary">
             <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
                {entry.images.map((image) => (
                  <div key={image.id} className="relative flex-none w-full aspect-[4/3] snap-center">
                     <img
                       src={image.url}
                       alt="Review photo"
                       className="w-full h-full object-cover"
                     />
                     {/* Image Like Overlay */}
                     <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onImageLike?.(entry.id, image.id);
                          }}
                          className="flex items-center gap-1 text-white hover:text-red-400 transition-colors"
                        >
                          <Heart
                             className={`w-3.5 h-3.5 ${image.is_liked ? "fill-red-500 text-red-500" : "text-white"}`}
                          />
                          <span className="text-[10px] font-medium text-white">{image.likes_count}</span>
                        </button>
                     </div>
                  </div>
                ))}
             </div>
             {/* Pagination Dots (if multiple) */}
             {entry.images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                   {entry.images.map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                   ))}
                </div>
             )}
          </div>
        ) : (
          posterUrl && (
            <div className="aspect-[4/3] relative bg-secondary overflow-hidden">
              <img
                src={posterUrl}
                alt={mainTitle || ""}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Watch With Facepile Overlay - Only if watchlist and has users */}
              {isWatchlist && watchWithUsers.length > 0 && (
                <div className="absolute bottom-2 right-2 flex -space-x-2 z-10">
                    {watchWithUsers.slice(0, 3).map(u => (
                      <Avatar key={u.id} className="h-6 w-6 ring-2 ring-background border border-white/20">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px] bg-secondary text-foreground">{u.username?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {watchWithUsers.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-black/60 ring-2 ring-background border border-white/20 flex items-center justify-center text-[8px] text-white">
                          +{watchWithUsers.length - 3}
                      </div>
                    )}
                </div>
              )}
            </div>
          )
        )
      )}

      {/* 3. Content Body */}
      <div className="flex flex-col flex-1 p-2.5 md:p-4 md:pt-3 gap-2">
        {/* Building Name (Context) - Only if NOT hidden */}
        {!hideBuildingInfo && (
          <div className="mb-1">
            <h3 className="text-base font-bold text-foreground line-clamp-2 leading-tight">
              {mainTitle}
            </h3>
            {subTitle && (
              <p className="text-xs text-muted-foreground line-clamp-1 truncate">
                {subTitle}
              </p>
            )}
          </div>
        )}

        {/* Status Badges & Rating */}
        {entry.status === 'pending' && (
          <div className="mb-2 mt-1">
            <Badge variant="secondary" className="font-semibold text-[10px] px-2 h-5 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200">
              WANT TO VISIT
            </Badge>
          </div>
        )}

        {entry.status === 'visited' && entry.rating && (
          <div className="flex items-center gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < entry.rating!
                        ? "fill-yellow-500 text-yellow-500"
                        : "fill-transparent text-muted-foreground/30"
                    }`}
                  />
              ))}
          </div>
        )}

        {/* Review Text: Only show if exists */}
        {entry.content && (
           <p className="text-sm font-medium text-foreground line-clamp-3 leading-relaxed">
             "{entry.content}"
           </p>
        )}

        {/* Tags Section - UPDATED */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {entry.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 h-6 font-normal text-muted-foreground/80">
                {tag}
              </Badge>
            ))}
            {entry.tags.length > 3 && (
              <span className="text-xs text-muted-foreground self-center">+{entry.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* 4. Action Footer */}
        <div className="mt-auto pt-3 flex items-center gap-4 border-t border-border/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(entry.id);
              // Trigger PWA interaction check on like
              window.dispatchEvent(new CustomEvent('pwa-interaction'));
            }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group/like"
          >
            <Heart
              className={`h-4 w-4 transition-transform group-hover/like:scale-110 ${
                entry.is_liked ? "fill-primary text-primary" : ""
              }`}
            />
            <span className="text-xs font-medium">{entry.likes_count}</span>
          </button>
          
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group/comment"
          >
            <MessageCircle className="h-4 w-4 transition-transform group-hover/comment:scale-110" />
            <span className="text-xs font-medium">{entry.comments_count}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
