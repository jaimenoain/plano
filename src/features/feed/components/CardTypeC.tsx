import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getBuildingUrl } from "@/utils/url";
import { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import { SuggestedContentBlock } from "@/features/feed/components/SuggestedContentBlock";
import {
  ActivityLead,
  BuildingHeadline,
  BuildingSubtitle,
  CardFooter,
  CardImage,
} from "@/features/feed/components/card-parts";
import { CARD_C_IMAGE_HEIGHT } from "@/features/feed/utils/resolveCardType";

export interface CardTypeCProps {
  entry: FeedReview;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
}

/**
 * Media-only feed card: fixed-height strip, building lockup, actions — no rating chip or body.
 */
export function CardTypeC({
  entry,
  hideUser = false,
  hideBuildingInfo = false,
  showCommunityImages = true,
  onLike,
  onComment,
  onImageLike,
}: CardTypeCProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data } = useReviewCardData(entry, {
    variant: "default",
    showCommunityImages,
  });

  if (!data || !entry.building) return null;

  const { username, isArchitectOfBuilding, mainTitle, subTitle, city, mediaItems } = data;
  const userActionVerb = entry.status === "pending" ? "wants to visit" : "visited";
  const isSavedToList = statuses[entry.building.id] === "pending";

  const handleSave = async () => {
    if (!user || !entry.building?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: entry.building.id,
          status: "pending",
          edited_at: new Date().toISOString(),
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

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building?.id) {
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(entry.id);
    } else if (entry.building?.id) {
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  return (
    <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
      <article
        data-testid={`card-type-c-${entry.id}`}
        onClick={handleCardClick}
        className={cn(
          "group/card relative w-full cursor-pointer min-w-0 max-w-full",
          isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
        )}
      >
        <CardImage
          items={mediaItems}
          height={CARD_C_IMAGE_HEIGHT}
          reviewId={entry.id}
          onImageLike={onImageLike}
        />
        <div className="flex max-w-xl flex-col gap-3 pt-4">
          <ActivityLead username={username} verb={userActionVerb} hideUser={hideUser} />
          {!hideBuildingInfo && <BuildingHeadline name={mainTitle} size="md" />}
          {!hideBuildingInfo && (
            <BuildingSubtitle subTitle={subTitle ?? undefined} city={city} />
          )}
          <CardFooter
            className="pt-1"
            likesCount={entry.likes_count}
            commentsCount={entry.comments_count}
            isLiked={Boolean(entry.is_liked)}
            isSaved={isSavedToList}
            onLike={() => {
              onLike?.(entry.id);
              window.dispatchEvent(new CustomEvent("pwa-interaction"));
            }}
            onComment={handleComment}
            onSave={() => void handleSave()}
            isSaving={isSaving}
          />
        </div>
      </article>
    </SuggestedContentBlock>
  );
}
