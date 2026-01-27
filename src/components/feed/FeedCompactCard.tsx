import { Heart, MessageCircle, Circle, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { getBuildingImageUrl } from "@/utils/image";
import { useState } from "react";

interface FeedCompactCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

export function FeedCompactCard({
  entry,
  onLike,
  onComment
}: FeedCompactCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
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

  // Passive Action -> saved
  const actionText = entry.status === 'pending' ? 'saved' : 'visited';

  const posterUrl = getBuildingImageUrl(entry.building.main_image_url);

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
          <span className="font-semibold text-foreground">{username}</span>
          <span className="text-muted-foreground"> {actionText} </span>
          <span className="font-semibold text-foreground">{mainTitle}</span>
          {city && <span className="text-muted-foreground font-normal"> in {city}</span>}
          <span className="text-muted-foreground text-xs ml-2">• {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago</span>
        </div>
      </div>

      {/* Content Body */}
      <div className="px-4 py-3 flex flex-col gap-2">
         {entry.rating && entry.rating > 0 && (
             <div className="flex items-center gap-0.5">
                 {Array.from({ length: 5 }).map((_, i) => (
                    <Circle
                       key={i}
                       className={`w-3 h-3 ${i < entry.rating! ? "fill-[#595959] text-[#595959]" : "fill-transparent text-muted-foreground/30"}`}
                    />
                 ))}
             </div>
        )}
        {entry.content && (
           <p className="text-sm text-foreground leading-relaxed">
             {entry.content}
           </p>
        )}
      </div>

      {/* Stock Image */}
      {posterUrl && (
          <div className="w-full bg-secondary overflow-hidden aspect-[4/3]">
              <img src={posterUrl} className="w-full h-full object-cover" alt="Building" />
          </div>
      )}

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
