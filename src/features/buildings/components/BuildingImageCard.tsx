import { useState, useEffect } from "react";
import { Heart, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
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
  /** Building name used to generate a descriptive alt text for the image. */
  buildingName?: string;
}

export function BuildingImageCard({ image, initialIsLiked, onOpen, buildingName }: BuildingImageCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(image.likes_count);
  const [isProcessing, setIsProcessing] = useState(false);

  const isVideo = image.type === 'video';
  const isVideoPlaceholder = isVideo && !image.poster;

  const imageAlt = buildingName
    ? (image.user?.username
        ? `${buildingName} — photo by ${image.user.username} on Plano`
        : `${buildingName} — community photo on Plano`)
    : "";

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
    } catch (_error) {
setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      toast({ variant: "destructive", title: "Failed to update like" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative aspect-square rounded-none overflow-hidden group cursor-pointer"
    >
      <img
        src={isVideo && image.poster ? image.poster : image.url}
        className={`w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 ${isVideoPlaceholder ? "opacity-50" : ""}`}
        alt={imageAlt}
      />

      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 /* Photo overlay — bg-black/40 approved per COMPONENT_SPEC §8 backdrop convention */ rounded-sm p-2 backdrop-blur-sm">
            <Play className="w-5 h-5 text-text-inverse fill-text-inverse" />
          </div>
        </div>
      )}

      {image.is_generated && (
        <div className="absolute top-1.5 left-1.5 pointer-events-none">
          <span className="bg-black/60 text-text-inverse text-[10px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm border border-white/10 uppercase tracking-wider">
            Render
          </span>
        </div>
      )}

      {!isVideo && (
        <div className="absolute bottom-2 right-2 bg-surface-card/80 backdrop-blur-sm rounded-sm px-2 py-0.5 text-xs font-medium flex items-center gap-1">
          <Heart
            className={`w-3.5 h-3.5 ${isLiked ? "fill-feedback-destructive text-feedback-destructive" : "text-text-secondary"}`}
            onClick={handleLike}
          />
          <span className="text-text-secondary">{likesCount}</span>
        </div>
      )}
    </button>
  );
}
