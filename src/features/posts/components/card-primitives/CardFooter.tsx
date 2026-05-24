import { useState } from "react";
import { Heart, MessageCircle, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import type { CardBookmarkHoverGroup } from "./CardBookmark";

export interface CardFooterProps {
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  /** When set, renders Save button with Supabase save. Omit to hide (e.g. building detail cards). */
  buildingId?: string | null;
  /** When false, Save is omitted (editorial home feed uses FeedPostByline for save). Default true. */
  showSave?: boolean;
  bookmarkHoverGroup?: CardBookmarkHoverGroup;
  className?: string;
}

export function CardFooter({
  likesCount,
  commentsCount,
  isLiked,
  onLike,
  onComment,
  buildingId,
  showSave = true,
  className,
}: CardFooterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const isSaved = buildingId ? statuses[buildingId] === "pending" : false;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !buildingId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: buildingId,
          status: "pending",
        },
        { onConflict: "user_id,building_id" },
      );
      if (error) throw error;
      toast({ title: "Saved to your list" });
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  };

  const btnBase =
    "flex items-center gap-2 font-sans text-[10px] tracking-[0.18em] uppercase transition-colors";

  return (
    <div className={cn("flex w-full items-center justify-between", className)}>
      {/* Left: Like + Discuss */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className={cn(
            btnBase,
            "pr-4 border-r border-border-default",
            isLiked ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
          )}
        >
          <Heart
            className={cn("h-3 w-3", isLiked && "fill-current")}
            strokeWidth={1.75}
            aria-hidden
          />
          {likesCount > 0 && <span className="font-mono">{likesCount}</span>}
          <span>Like</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComment();
          }}
          className={cn(btnBase, "pl-4 text-text-secondary hover:text-text-primary")}
        >
          <MessageCircle className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          {commentsCount > 0 && <span className="font-mono">{commentsCount}</span>}
          <span>Discuss</span>
        </button>
      </div>

      {/* Right: Save */}
      {showSave && buildingId ? (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label={isSaved ? "Saved to your list" : "Save building to your list"}
          className={cn(
            btnBase,
            "text-text-primary hover:text-text-secondary",
            isSaving && "pointer-events-none opacity-50",
          )}
        >
          <Bookmark
            className={cn("h-3 w-3", isSaved && "fill-current")}
            strokeWidth={1.75}
            aria-hidden
          />
          <span>{isSaved ? "Saved" : "Save"}</span>
        </button>
      ) : null}
    </div>
  );
}
