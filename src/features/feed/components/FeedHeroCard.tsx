import { Heart, MessageCircle, Circle, Bookmark, Check, EyeOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { useState } from "react";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface FeedHeroSingleImageProps {
  image: { id: string; url: string };
  onError: (id: string) => void;
}

function FeedHeroSingleImage({ image, onError }: FeedHeroSingleImageProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalHeight > 0) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  // 4:5 aspect ratio = 0.8
  const MAX_ASPECT_RATIO = 0.8;

  // While loading, use a placeholder aspect ratio (e.g., 4:5)
  if (aspectRatio === null) {
    return (
      <div className="relative w-full aspect-[4/5] bg-surface-muted animate-pulse">
        <img
          src={image.url}
          className="opacity-0 absolute inset-0 w-full h-full max-w-full"
          onLoad={handleLoad}
          onError={() => onError(image.id)}
          alt="Building"
        />
      </div>
    );
  }

  const isTall = aspectRatio < MAX_ASPECT_RATIO;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden flex justify-center items-center transition-all duration-300",
        isTall ? "bg-black" : "bg-surface-muted"
      )}
      style={{
        aspectRatio: isTall ? `${MAX_ASPECT_RATIO}` : `${aspectRatio}`,
      }}
    >
      <img
        src={image.url}
        onError={() => onError(image.id)}
        className={cn(
          "w-full h-full transition-opacity duration-300 max-w-full",
          isTall ? "object-contain" : "object-cover"
        )}
        alt="Building"
      />
    </div>
  );
}

interface FeedHeroCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
}

export function FeedHeroCard({
  entry,
  onLike,
  onImageLike: _onImageLike, // kept for prop compatibility
  onComment
}: FeedHeroCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses, ratings } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [showRatingInput, setShowRatingInput] = useState(false);

  if (!entry.building) return null;

  const viewerStatus = entry.building ? statuses[entry.building.id] : undefined;
  const viewerRating = entry.building ? ratings[entry.building.id] : undefined;

  const isSaved = viewerStatus === 'pending';
  const isVisited = viewerStatus === 'visited';
  const isIgnored = viewerStatus === 'ignored';

  const navigateToReview = () => {
    if (!entry.building?.id) return;
    const url = entry.building.slug
        ? `/building/${entry.building.id}/${entry.building.slug}/review`
        : `/building/${entry.building.id}/review`;
    navigate(url);
  };

  const handleHide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;

    if (isIgnored) {
        navigateToReview();
        return;
    }

    setIsSaving(true);
    try {
        const { error } = await supabase.from("user_buildings").upsert({
            user_id: user.id,
            building_id: entry.building.id,
            status: 'ignored',
            edited_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' });

        if (error) throw error;
        toast({ title: "Building hidden" });
        queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
    } catch (_error) {
toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;

    if (isSaved) {
        navigateToReview();
        return;
    }

    setIsSaving(true);
    try {
        // Save (upsert pending)
        const { error } = await supabase.from("user_buildings").upsert({
            user_id: user.id,
            building_id: entry.building.id,
            status: 'pending',
            edited_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' });

        if (error) throw error;
        toast({ title: "Saved to your list" });
        queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
        setShowRatingInput(true);
    } catch (_error) {
toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleVisit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;

    if (isVisited) {
        navigateToReview();
        return;
    }

    setIsSaving(true);
    try {
        // Mark Visited (upsert visited)
        const { error } = await supabase.from("user_buildings").upsert({
            user_id: user.id,
            building_id: entry.building.id,
            status: 'visited',
            edited_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' });

        if (error) throw error;
        toast({ title: "Marked as visited" });
        queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
        setShowRatingInput(true);
    } catch (_error) {
toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleRate = async (newRating: number) => {
    if (!user || !entry.building?.id) return;

    try {
        const { error } = await supabase.from("user_buildings").upsert({
            user_id: user.id,
            building_id: entry.building.id,
            rating: newRating,
            edited_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' });

        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
    } catch (_err) {
toast({ variant: "destructive", title: "Failed to update rating" });
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    if (entry.building.id) {
        navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
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
            navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
        } else {
            navigate(`/review/${entry.id}`);
        }
    }
  };

  const username = entry.user?.username || "Unknown User";
  const avatarUrl = entry.user?.avatar_url || undefined;
  const userInitial = username.charAt(0).toUpperCase();
  const mainTitle = entry.building.name;
  const city = entry.building.city || entry.building.address?.split(',').pop()?.trim() || "";

  const handleImageError = (imageId: string) => {
    setFailedImages(prev => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  // Image Grid Logic
  const images = (entry.images || []).filter(img => !failedImages.has(img.id));
  const count = images.length;

  const renderImages = () => {
    if (count === 0) return null;

    if (count === 1) {
      return (
        <FeedHeroSingleImage
          key={images[0].id}
          image={images[0]}
          onError={handleImageError}
        />
      );
    }

    if (count === 2) {
      return (
        <div className="flex flex-col gap-0.5">
          {images.map((img) => (
            <FeedHeroSingleImage
              key={img.id}
              image={img}
              onError={handleImageError}
            />
          ))}
        </div>
      );
    }

    if (count >= 3 && count <= 5) {
      return (
        <div className="flex flex-col gap-0.5">
          {/* First Image - Full Width */}
          <div className="relative w-full aspect-[4/3] min-w-0 overflow-hidden">
            <img
              src={images[0].url}
              onError={() => handleImageError(images[0].id)}
              className="w-full h-full object-cover max-w-full"
              alt="Building"
            />
          </div>
          {/* Remaining Images - Side by Side */}
          <div
            className={cn(
              "grid gap-0.5",
              count === 3 && "grid-cols-2",
              count === 4 && "grid-cols-3",
              count === 5 && "grid-cols-2 sm:grid-cols-4"
            )}
          >
            {images.slice(1).map((img) => (
              <div key={img.id} className="relative w-full aspect-square min-w-0 overflow-hidden">
                <img
                  src={img.url}
                  onError={() => handleImageError(img.id)}
                  className="w-full h-full object-cover max-w-full"
                  alt="Building"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (count > 5) {
      const remaining = count - 5;
      return (
        <div className="flex flex-col gap-0.5">
          {/* First Image - Full Width */}
          <div className="relative w-full aspect-[4/3] min-w-0 overflow-hidden">
            <img
              src={images[0].url}
              onError={() => handleImageError(images[0].id)}
              className="w-full h-full object-cover max-w-full"
              alt="Building"
            />
          </div>
          {/* Row 2: 4 images + box = 5 columns */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-0.5">
            {images.slice(1, 5).map((img) => (
              <div key={img.id} className="relative w-full aspect-square min-w-0 overflow-hidden">
                <img
                  src={img.url}
                  onError={() => handleImageError(img.id)}
                  className="w-full h-full object-cover max-w-full"
                  alt="Building"
                />
              </div>
            ))}
            {/* The "More" Box */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/review/${entry.id}`);
              }}
              className="relative w-full aspect-square bg-surface-muted flex items-center justify-center text-text-secondary font-medium text-sm border-l border-surface-default cursor-pointer hover:bg-surface-muted/80 transition-colors min-w-0 overflow-hidden"
            >
              +{remaining}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderRatingControl = () => {
     // 3 circles (values 1-3)
     const options = [1, 2, 3];
     return (
         <div className="flex items-center gap-1 mr-2 bg-surface-muted/80 backdrop-blur-sm px-2.5 py-1.5 rounded-sm animate-in fade-in slide-in-from-right-5 duration-200 border border-border-default/50 shadow-none" onClick={(e) => e.stopPropagation()}>
             {options.map((val) => {
                 const isFilled = (viewerRating || 0) >= val;
                 return (
                     <button
                        key={val}
                        onClick={() => handleRate(val)}
                        className="focus:outline-none transition-transform active:scale-90 hover:scale-110"
                     >
                         <Circle
                            className={`w-3.5 h-3.5 transition-colors ${
                                isFilled
                                ? "fill-brand-primary text-brand-primary"
                                : "text-text-secondary/40 hover:text-brand-primary/70"
                            }`}
                         />
                     </button>
                 );
             })}
         </div>
     );
  };

  return (
    <article
      onClick={handleCardClick}
      className="group relative flex flex-col w-full max-w-full min-w-0 bg-surface-card border border-border-default rounded-sm shadow-none overflow-hidden cursor-pointer mb-6 hover:border-border-strong transition-colors"
    >
      {/* Header */}
      <div className="p-6 flex items-start gap-3 border-b border-border-default/40">
        <Avatar className="h-8 w-8 border border-border-default/50 mt-0.5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0 max-w-full overflow-hidden">
          {/* User row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">{username}</span>
              <span className="text-xs text-text-secondary">
                {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
              </span>
            </div>
            {city && <span className="text-xs text-text-secondary">{city}</span>}
          </div>

          {/* Building name + rating */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-left text-xl font-semibold text-text-primary hover:underline truncate">
              {mainTitle}
            </span>
            {entry.rating && entry.rating > 0 && (
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Circle
                    key={i}
                    className={`w-3 h-3 ${
                      i < entry.rating!
                        ? "fill-brand-primary text-brand-primary"
                        : "fill-transparent text-text-secondary/30"
                    }`}
                  />
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Body (Review Text) */}
      {entry.content && (
        <div className="px-6 pt-4 pb-2 flex flex-col gap-3 max-w-full overflow-hidden">
           <p className="text-sm text-text-primary leading-relaxed break-words w-full">
             {entry.content}
           </p>
        </div>
      )}

      {/* Hero Images (UGC) - Full Bleed */}
      <div className="w-full bg-surface-muted overflow-hidden min-w-0">
        {renderImages()}
      </div>

      {/* Footer */}
      <div className="p-6 pt-4 flex items-center justify-between mt-auto border-t border-border-default/50">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(entry.id);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-surface-muted hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            title={`${entry.likes_count} likes`}
          >
            <Heart
              className={`h-4 w-4 ${
                entry.is_liked ? "fill-brand-primary text-brand-primary" : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={handleCommentClick}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            title={`${entry.comments_count} comments`}
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {(isSaved || isVisited || showRatingInput) && renderRatingControl()}

          {(!viewerStatus || isVisited) && (
            <button
              type="button"
              onClick={handleVisit}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50"
              disabled={isSaving}
              title={isVisited ? "Mark as not visited" : "Mark as visited"}
            >
              <Check className={`h-4 w-4 ${isVisited ? "stroke-[3px] text-brand-primary" : ""}`} />
            </button>
          )}

          {(!viewerStatus || isSaved) && (
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50"
              disabled={isSaving}
              title={isSaved ? "Saved to your list" : "Save to your list"}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-brand-primary text-brand-primary" : ""}`} />
            </button>
          )}

          {(!viewerStatus || isIgnored) && (
            <button
              type="button"
              onClick={handleHide}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:opacity-50"
              disabled={isSaving}
              title={isIgnored ? "Hidden from your map" : "Hide from map"}
            >
              <EyeOff className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
