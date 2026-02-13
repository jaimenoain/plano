import { useState, useEffect } from "react";
import { Heart, MessageCircle, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BuildingImageCardProps {
  image: {
    id: string;
    url: string;
    poster?: string;
    type?: 'image' | 'video';
    likes_count: number;
    created_at: string;
    user: {
      username: string | null;
      avatar_url: string | null;
    } | null;
    is_generated?: boolean;
  };
  initialIsLiked: boolean;
  onOpen: () => void;
}

export function BuildingImageCard({ image, initialIsLiked, onOpen }: BuildingImageCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(image.likes_count);
  const [isProcessing, setIsProcessing] = useState(false);

  const isVideo = image.type === 'video';
  const isVideoPlaceholder = isVideo && !image.poster;

  // Sync state if initialIsLiked changes (e.g. parent refetch)
  useEffect(() => {
    setIsLiked(initialIsLiked);
  }, [initialIsLiked]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Please sign in to like photos" });
      return;
    }
    if (isVideo) return; // Videos don't support per-image likes yet
    if (isProcessing) return;

    setIsProcessing(true);
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (previousIsLiked) {
        const { error } = await supabase
          .from("image_likes")
          .delete()
          .eq("image_id", image.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("image_likes")
          .insert({
            image_id: image.id,
            user_id: user.id
          });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      toast({ variant: "destructive", title: "Failed to update like" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-3 group">
      <div className="relative rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/5">
        <img
          src={isVideo && image.poster ? image.poster : image.url}
          className={`w-full h-auto max-h-[600px] object-cover cursor-pointer hover:opacity-90 transition-opacity ${isVideoPlaceholder ? 'opacity-50' : ''}`}
          alt="Building visual"
          onClick={onOpen}
        />

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
        )}

        {image.is_generated && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm border border-white/10 uppercase tracking-wider">
              Render
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-8 h-8 border border-border shrink-0">
            <AvatarImage src={image.user?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground border-border">
              {image.user?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {image.user?.username || "Anonymous"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {format(new Date(image.created_at), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground shrink-0">
          {!isVideo && (
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${isLiked ? 'text-red-500 hover:text-red-600' : ''}`}
              disabled={isProcessing}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likesCount}</span>
            </button>
          )}

          <button
            onClick={onOpen}
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
