import { Heart, MessageCircle, Circle, Bookmark, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { useState } from "react";
import { useUserBuildingStatuses } from "@/hooks/useUserBuildingStatuses";
import { useQueryClient } from "@tanstack/react-query";

interface FeedHeroCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
}

export function FeedHeroCard({
  entry,
  onLike,
  onImageLike, // kept for prop compatibility
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

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;

    if (isSaved) {
        setShowRatingInput(true);
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
    } catch (error) {
        console.error("Save action failed", error);
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
        setShowRatingInput(true);
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
    } catch (error) {
        console.error("Visit action failed", error);
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
    } catch (err) {
        console.error("Rate failed", err);
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

  // "Active" actions use bolder typography.
  const actionText = "added photos of";

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
        <div className="relative w-full aspect-[4/5] max-h-[500px]">
          <img
            src={images[0].url}
            onError={() => handleImageError(images[0].id)}
            className="w-full h-full object-cover object-center"
            alt="Building"
          />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="flex flex-col gap-0.5">
          {images.map((img) => (
            <div key={img.id} className="relative w-full aspect-[4/3]">
              <img
                src={img.url}
                onError={() => handleImageError(img.id)}
                className="w-full h-full object-cover"
                alt="Building"
              />
            </div>
          ))}
        </div>
      );
    }

    if (count >= 3 && count <= 5) {
      return (
        <div className="flex flex-col gap-0.5">
          {/* First Image - Full Width */}
          <div className="relative w-full aspect-[4/3]">
            <img
              src={images[0].url}
              onError={() => handleImageError(images[0].id)}
              className="w-full h-full object-cover"
              alt="Building"
            />
          </div>
          {/* Remaining Images - Side by Side */}
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${count - 1}, minmax(0, 1fr))` }}
          >
            {images.slice(1).map((img) => (
              <div key={img.id} className="relative w-full aspect-square">
                <img
                  src={img.url}
                  onError={() => handleImageError(img.id)}
                  className="w-full h-full object-cover"
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
          <div className="relative w-full aspect-[4/3]">
            <img
              src={images[0].url}
              onError={() => handleImageError(images[0].id)}
              className="w-full h-full object-cover"
              alt="Building"
            />
          </div>
          {/* Row 2: 4 images + box = 5 columns */}
          <div className="grid grid-cols-5 gap-0.5">
            {images.slice(1, 5).map((img) => (
              <div key={img.id} className="relative w-full aspect-square">
                <img
                  src={img.url}
                  onError={() => handleImageError(img.id)}
                  className="w-full h-full object-cover"
                  alt="Building"
                />
              </div>
            ))}
            {/* The "More" Box */}
            <div className="relative w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground font-medium text-sm border-l border-background">
              +{remaining}
            </div>
          </div>
        </div>
      );
    }
  };

  const renderRatingControl = () => {
     // 4 circles (values 1-4)
     const options = [1, 2, 3, 4];
     return (
         <div className="flex items-center gap-1 mr-2 bg-secondary/80 backdrop-blur-sm px-2.5 py-1.5 rounded-full animate-in fade-in slide-in-from-right-5 duration-200 border border-border/50 shadow-sm" onClick={(e) => e.stopPropagation()}>
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
                                ? "fill-primary text-primary"
                                : "text-muted-foreground/40 hover:text-primary/70"
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
      className="group relative flex flex-col w-full bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer mb-6"
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3 border-b border-border/40">
        <Avatar className="h-10 w-10 border border-border/50 mt-0.5">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5 w-full">
          {/* Line 1: User Action Building */}
          <div className="text-sm md:text-base text-foreground leading-snug">
            <span className="font-bold text-foreground">{username}</span>
            <span className="text-muted-foreground/60 font-normal"> {actionText} </span>
            <span className="font-bold text-foreground">{mainTitle}</span>
          </div>

          {/* Line 2: Metadata */}
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
             {city && <span>{city}</span>}
             {city && (!entry.rating || entry.rating <= 0) && <span>•</span>}

             {/* Rating */}
             {entry.rating && entry.rating > 0 && (
                <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Circle
                            key={i}
                            className={`w-3 h-3 ${i < entry.rating! ? "fill-[#595959] text-[#595959]" : "fill-transparent text-muted-foreground/30"}`}
                        />
                    ))}
                </span>
             )}

             <span>{formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago</span>
          </div>
        </div>
      </div>

      {/* Content Body (Review Text) */}
      {entry.content && (
        <div className="px-4 pt-3 pb-2 flex flex-col gap-2">
           <p className="text-sm text-foreground leading-relaxed">
             {entry.content}
           </p>
        </div>
      )}

      {/* Hero Images (UGC) - Full Bleed */}
      <div className="w-full bg-secondary overflow-hidden">
        {renderImages()}
      </div>

      {/* Footer */}
      <div className="p-4 pt-3 flex items-center gap-4 mt-auto border-t border-border/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(entry.id);
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

           <div className="flex items-center gap-2 ml-auto">

             {showRatingInput && renderRatingControl()}

             <button
               onClick={handleVisit}
               className={`flex items-center gap-1.5 transition-all px-2.5 py-1.5 rounded-full ${
                  isVisited
                    ? 'text-primary bg-primary/10 font-bold ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
               } ${isSaving ? 'opacity-50' : ''}`}
               disabled={isSaving}
             >
               <Check className={`h-4 w-4 ${isVisited ? 'stroke-[3px]' : ''}`} />
               <span className={`text-xs ${isVisited ? '' : 'font-medium'}`}>Visited</span>
             </button>

             <button
               onClick={handleSave}
               className={`flex items-center gap-1.5 transition-all px-2.5 py-1.5 rounded-full ${
                  isSaved
                    ? 'text-primary bg-primary/10 font-bold ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
               } ${isSaving ? 'opacity-50' : ''}`}
               disabled={isSaving}
             >
               <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-primary' : ''}`} />
               <span className={`text-xs ${isSaved ? '' : 'font-medium'}`}>Save</span>
             </button>
           </div>
      </div>
    </article>
  );
}
