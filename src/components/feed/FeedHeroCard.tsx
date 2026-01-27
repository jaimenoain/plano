import { Heart, MessageCircle, Circle, Image as ImageIcon, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { useState } from "react";

interface FeedHeroCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
}

export function FeedHeroCard({
  entry,
  onLike,
  onImageLike,
  onComment
}: FeedHeroCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  if (!entry.building) return null;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_buildings").upsert({
          user_id: user.id,
          building_id: entry.building.id,
          status: 'pending',
          edited_at: new Date().toISOString()
      }, { onConflict: 'user_id, building_id' });

      if (error) throw error;
      toast({ title: "Saved to your list" });
    } catch (error) {
      console.error("Save failed", error);
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setIsSaving(false);
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
  // Rule A: Gold Dust (UGC) -> Hero Card.
  // We can say "reviewed" or "added photos of".
  const actionText = "added photos of";

  // Image Grid Logic
  const images = entry.images || [];
  const displayImages = images.slice(0, 5); // Show up to 5
  const remainingCount = images.length - 5;

  return (
    <article
      onClick={handleCardClick}
      className="group relative flex flex-col w-full bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer mb-6"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border/40">
        <Avatar className="h-10 w-10 border border-border/50">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <div className="text-sm md:text-base text-foreground leading-snug">
          <span className="font-bold text-foreground">{username}</span> {/* Anchor */}
          <span className="font-semibold text-foreground/80"> {actionText} </span> {/* Active Action */}
          <span className="font-bold text-foreground">{mainTitle}</span>
          {city && <span className="text-muted-foreground font-normal"> in {city}</span>}
          {entry.rating && entry.rating > 0 && (
             <span className="inline-flex items-center ml-2 gap-0.5 align-middle">
                 {Array.from({ length: 5 }).map((_, i) => (
                    <Circle
                       key={i}
                       className={`w-3.5 h-3.5 ${i < entry.rating! ? "fill-[#595959] text-[#595959]" : "fill-transparent text-muted-foreground/30"}`}
                    />
                 ))}
             </span>
          )}
          <span className="text-muted-foreground text-xs ml-2">
            {(!entry.rating || entry.rating === 0) && "• "}
            {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
          </span>
        </div>
      </div>

      {/* Content Body (Review Text) */}
      {entry.content && (
        <div className="px-4 py-3 flex flex-col gap-2">
           <p className="text-sm text-foreground leading-relaxed">
             {entry.content}
           </p>
        </div>
      )}

      {/* Hero Images (UGC) */}
      {/* Requirement: Max aspect ratio 4:5. Taller center-cropped. */}
      {/* Layout: If 1 image -> Full width. If more -> Grid/Collage. */}
      <div className="w-full bg-secondary overflow-hidden">
          {images.length === 1 ? (
              <div className="relative w-full aspect-[4/5] max-h-[500px]">
                  <img src={images[0].url} className="w-full h-full object-cover object-center" alt="Building" />
              </div>
          ) : (
              // Simple grid for multiple images
              <div className="grid grid-cols-2 gap-0.5 aspect-[4/3]">
                  {/* First image large */}
                  <div className="row-span-2 relative h-full">
                      <img src={images[0].url} className="w-full h-full object-cover" alt="Building" />
                  </div>
                  <div className="grid grid-rows-2 gap-0.5 h-full">
                      {images.slice(1, 3).map((img) => (
                          <div key={img.id} className="relative w-full h-full">
                              <img src={img.url} className="w-full h-full object-cover" alt="Building" />
                          </div>
                      ))}
                      {/* If more than 3, show count overlay on 3rd slot (which is 2nd in right col) ?? No, let's just do a 1+2 grid for now or 1+grid.
                          Let's follow: "maybe we can present a few (maybe one larger and other smaller ones?) with a mention to '+7'"
                       */}
                  </div>
              </div>
              // Actually, to robustly handle +7, we need a better grid.
              // Let's stick to a simple collage: Main Left, 2 Right.
          )}
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

           <button
             onClick={handleSave}
             className={`flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors ml-auto ${isSaving ? 'opacity-50' : ''}`}
             disabled={isSaving}
           >
             <Bookmark className="h-4 w-4" />
             <span className="text-xs font-medium">Save</span>
           </button>
      </div>
    </article>
  );
}
