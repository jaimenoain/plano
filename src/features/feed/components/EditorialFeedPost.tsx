import { type MouseEvent } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";
import type { FeedReview } from "@/types/feed";
import { useReviewCardData } from "@/features/posts/hooks/useReviewCardData";
import { useTrackNoteView } from "@/features/posts/hooks/useTrackNoteView";
import { countWords } from "@/features/posts/utils/resolveCardType";
import { BuildingHeadline, CardFooter, CardImage } from "@/features/posts/components/card-parts";
import { SuggestedContentBlock } from "@/features/posts/components/SuggestedContentBlock";
import { CommonFollowersFacepile } from "@/features/profile/components/CommonFollowersFacepile";
import { FeedEditorialEyebrow } from "./FeedEditorialEyebrow";
import { FeedPostByline } from "./FeedPostByline";

export interface EditorialFeedPostProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
}

function buildContextLabel(entry: FeedReview): string | null {
  const tags = entry.tags?.filter(Boolean);
  if (tags && tags.length > 0) {
    return tags.map((t) => t.toUpperCase()).join(" · ");
  }
  const city = entry.building?.city?.trim();
  const country = entry.building?.country?.trim();
  const locality = [city, country].filter(Boolean).join(", ");
  return locality ? locality.toUpperCase() : null;
}

/**
 * Signed-in home feed post — single-column editorial layout from `FeedPage.jsx`.
 * Eyebrow → title → pull quote → photo → byline → social actions.
 */
export function EditorialFeedPost({
  entry,
  onLike,
  onImageLike,
  onComment,
}: EditorialFeedPostProps) {
  const navigate = useNavigate();
  const trackViewRef = useTrackNoteView(entry.id, entry.user_id);
  const { data } = useReviewCardData(entry);

  if (!data || !entry.building) return null;

  const { username, isArchitectOfBuilding, mainTitle, mediaItems } = data;
  const architect = entry.building.creditedEntities?.[0]?.name;
  const year = entry.building.year_completed;
  const contextLabel = buildContextLabel(entry);
  const hasMedia = mediaItems.length > 0;
  const contentWords = countWords(entry.content);
  const showPullQuote = Boolean(entry.content?.trim()) && contentWords > 0;

  const openBuilding = () => {
    const b = entry.building;
    if (!b?.id) return;
    navigate(
      b.locality_country_code && b.locality_city_slug
        ? getBuildingLocalityUrl(b.locality_country_code, b.locality_city_slug, b.id, b.slug, b.short_id)
        : getBuildingUrl(b.id, b.slug, b.short_id),
    );
  };

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    openBuilding();
  };

  const handleComment = () => {
    if (onComment) {
      onComment(entry.id);
      return;
    }
    openBuilding();
  };

  const article = (
    <article
      ref={trackViewRef}
      data-testid={`editorial-feed-post-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card relative w-full min-w-0 cursor-pointer",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-6",
      )}
    >
      {entry.connectors && entry.connectors.length > 0 ? (
        <CommonFollowersFacepile
          users={entry.connectors}
          count={entry.connectors_count ?? entry.connectors.length}
        />
      ) : null}

      <FeedEditorialEyebrow
        contextLabel={contextLabel}
        architect={architect}
        year={year}
      />

      <BuildingHeadline
        name={`${mainTitle}.`}
        size="feed"
        className="mb-[14px] transition-opacity group-hover/card:opacity-55"
      />

      {showPullQuote ? (
        <p
          className={cn(
            "mb-[22px] max-w-[88%] text-[clamp(1.125rem,1.9vw,1.5rem)] font-medium leading-tight tracking-[-0.022em] text-text-secondary",
            contentWords > 40 && "line-clamp-4",
          )}
        >
          {entry.content}
        </p>
      ) : null}

      {hasMedia ? (
        <CardImage
          items={mediaItems}
          aspectRatio="16/9"
          reviewId={entry.id}
          onImageLike={onImageLike}
          firstMediaOnly={mediaItems.length > 1}
          className="rounded-none transition-transform duration-500 group-hover/card:scale-[1.01]"
        />
      ) : null}

      <FeedPostByline
        username={username}
        avatarUrl={data.avatarUrl}
        timestamp={entry.created_at}
        rating={entry.rating}
        buildingId={entry.building.id}
        onUsernameClick={() => navigate(`/profile/${username}`)}
      />

      <CardFooter
        className="mt-[22px] border-t border-border-default pt-4"
        showSave={false}
        likesCount={entry.likes_count}
        commentsCount={entry.comments_count}
        isLiked={Boolean(entry.is_liked)}
        buildingId={entry.building.id}
        onLike={() => {
          onLike?.(entry.id);
          window.dispatchEvent(new CustomEvent("pwa-interaction"));
        }}
        onComment={handleComment}
      />
    </article>
  );

  // When the "Followed by XYZ" facepile is shown, don't repeat it in the badge —
  // fall back to the location reason (or no reason) so the two don't duplicate.
  const hasConnectors = Boolean(entry.connectors && entry.connectors.length > 0);
  const badgeReason = hasConnectors
    ? entry.location_match === "city"
      ? "In your city"
      : entry.location_match === "country"
        ? "In your country"
        : undefined
    : entry.suggestion_reason;

  return (
    <SuggestedContentBlock
      isSuggested={entry.is_suggested}
      suggestionReason={badgeReason}
    >
      {article}
    </SuggestedContentBlock>
  );
}
