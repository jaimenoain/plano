import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import { getStorageAssetUrl } from "@/utils/image";

export interface FeedPostBylineProps {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  timestamp: string | Date;
  rating?: number | null;
  buildingId?: string | null;
  className?: string;
  onUsernameClick?: () => void;
}

function BylineRatingDots({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-[3px] align-middle"
      aria-label={`${rating} distinction${rating > 1 ? "s" : ""}`}
    >
      {Array.from({ length: rating }).map((_, i) => (
        <span key={i} className="h-[7px] w-[7px] rounded-full bg-text-primary" />
      ))}
    </span>
  );
}

function BylineAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl?: string | null;
}) {
  const resolved = avatarUrl ? getStorageAssetUrl(avatarUrl) : null;
  const initials = username.slice(0, 2).toUpperCase();

  if (resolved) {
    return (
      <img
        src={resolved}
        alt=""
        className="h-[22px] w-[22px] shrink-0 rounded-full object-cover bg-surface-muted"
      />
    );
  }

  return (
    <span
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-surface-inverse text-[9px] font-semibold uppercase text-text-inverse"
      aria-hidden
    >
      {initials}
    </span>
  );
}

/**
 * Post byline row — author, rating, time, and Save — per `FeedPage.jsx`.
 */
export function FeedPostByline({
  username,
  displayName,
  avatarUrl,
  timestamp,
  rating,
  buildingId,
  className,
  onUsernameClick,
}: FeedPostBylineProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: false });
  const isSaved = buildingId ? statuses[buildingId] === "pending" : false;
  const authorLabel = displayName?.trim() || username;

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

  return (
    <div className={cn("mt-[14px] flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">
        <BylineAvatar username={username} avatarUrl={avatarUrl} />
        <span className="text-text-disabled">By</span>
        <button
          type="button"
          onClick={(e) => {
            if (onUsernameClick) {
              e.stopPropagation();
              onUsernameClick();
            }
          }}
          className={cn(
            "font-semibold text-text-primary",
            onUsernameClick && "cursor-pointer hover:text-text-secondary transition-colors",
          )}
        >
          {authorLabel}
        </button>
        {rating != null && rating > 0 ? <BylineRatingDots rating={rating} /> : null}
        <span className="tracking-[0.06em] text-text-disabled">{timeAgo}</span>
      </div>

      {buildingId ? (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label={isSaved ? "Saved to your list" : "Save building to your list"}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-text-secondary transition-colors hover:text-text-primary",
            isSaving && "pointer-events-none opacity-50",
          )}
        >
          <Bookmark
            className={cn("h-3.5 w-3.5", isSaved && "fill-current")}
            strokeWidth={2}
            aria-hidden
          />
          {isSaved ? "Saved" : "Save"}
        </button>
      ) : null}
    </div>
  );
}
