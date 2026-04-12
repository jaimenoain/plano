import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
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
  PointsBadge,
} from "@/features/feed/components/card-parts";
import { CARD_B_HEIGHT, CARD_C_IMAGE_HEIGHT } from "@/features/feed/utils/resolveCardType";

const MD_MEDIA_QUERY = "(min-width: 768px)";

export interface CardTypeBProps {
  entry: FeedReview;
  /** Feed position for alternating image left/right when `imagePosition` is omitted. */
  index?: number;
  imagePosition?: "left" | "right";
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  showCommunityImages?: boolean;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
}

/**
 * Review + media: two-column 320px grid on md+, stacked image strip on small screens.
 */
export function CardTypeB({
  entry,
  index = 0,
  imagePosition,
  hideUser = false,
  hideBuildingInfo = false,
  showCommunityImages = true,
  onLike,
  onComment,
  onImageLike,
}: CardTypeBProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const [essayExpanded, setEssayExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const [cardImageHeight, setCardImageHeight] = useState(CARD_C_IMAGE_HEIGHT);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  const { data } = useReviewCardData(entry, {
    variant: "default",
    showCommunityImages,
  });

  useLayoutEffect(() => {
    const mq = window.matchMedia(MD_MEDIA_QUERY);
    const sync = () => {
      setCardImageHeight(mq.matches ? CARD_B_HEIGHT : CARD_C_IMAGE_HEIGHT);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setEssayExpanded(false);
  }, [entry.id]);

  const imageOnLeft =
    imagePosition === "right" ? false : imagePosition === "left" ? true : index % 2 === 0;

  const recheckOverflow = useCallback(() => {
    const el = bodyRef.current;
    if (!el || essayExpanded || !entry.content?.trim()) {
      setShowReadMore(false);
      return;
    }
    setShowReadMore(el.scrollHeight > el.clientHeight + 1);
  }, [entry.content, essayExpanded]);

  useLayoutEffect(() => {
    recheckOverflow();
  }, [recheckOverflow, entry.id]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || essayExpanded) return;
    const ro = new ResizeObserver(() => recheckOverflow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [essayExpanded, recheckOverflow]);

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
        data-testid={`card-type-b-${entry.id}`}
        onClick={handleCardClick}
        className={cn(
          "group/card relative w-full cursor-pointer min-w-0 max-w-full",
          isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
        )}
      >
        <div
          className={cn(
            "grid w-full min-w-0 grid-cols-1 gap-0 md:grid-cols-2 md:items-stretch md:h-80",
          )}
        >
          <div
            className={cn(
              "order-1 min-h-0 min-w-0 overflow-hidden md:h-full",
              imageOnLeft ? "md:order-1" : "md:order-2",
            )}
          >
            <CardImage
              items={mediaItems}
              height={cardImageHeight}
              reviewId={entry.id}
              onImageLike={onImageLike}
              className="h-full"
            />
          </div>
          <div
            className={cn(
              "order-2 flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden py-5 px-0 md:h-full md:min-h-0 md:py-7",
              imageOnLeft ? "md:order-2 md:pl-10" : "md:order-1 md:pr-10",
            )}
          >
            <div className="flex shrink-0 flex-col gap-3">
              <ActivityLead username={username} verb={userActionVerb} hideUser={hideUser} />
              {!hideBuildingInfo && <BuildingHeadline name={mainTitle} size="lg" />}
              {!hideBuildingInfo && (
                <BuildingSubtitle subTitle={subTitle ?? undefined} city={city} />
              )}
              {entry.rating != null && entry.rating > 0 && (
                <div>
                  <PointsBadge points={entry.rating} />
                </div>
              )}
            </div>
            {entry.content?.trim() && (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                <p
                  ref={bodyRef}
                  className={cn(
                    "text-base leading-relaxed text-text-secondary",
                    !essayExpanded && "line-clamp-4",
                  )}
                >
                  {entry.content}
                </p>
                {showReadMore && !essayExpanded && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEssayExpanded(true);
                    }}
                    className="mt-1.5 shrink-0 font-sans text-2xs tracking-[0.15em] uppercase text-text-primary transition-colors hover:text-text-secondary"
                  >
                    Read more →
                  </button>
                )}
              </div>
            )}
            <CardFooter
              className="mt-auto shrink-0 pt-1"
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
        </div>
      </article>
    </SuggestedContentBlock>
  );
}
