import { useEffect, useMemo, useState } from "react";
import { Bookmark, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import type { CardLayout, CardProminence, CardSpec, CardTextWeight } from "@/types/cards";
import { getBuildingUrl } from "@/utils/url";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { SuggestedContentBlock } from "./SuggestedContentBlock";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { FeedPhotoCarousel } from "./FeedPhotoCarousel";
import { useReviewCardData, type ReviewCardMediaItem } from "@/features/feed/hooks/useReviewCardData";
import { resolveCardSpec } from "@/features/feed/utils/resolveCardSpec";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Award points badge. Renders filled black dots only — no empty placeholders.
 * Shows nothing when points === 0. Points are an award (like Michelin stars),
 * not a score, so absence is neutral and must not be visualised.
 * Uses bg-text-primary (monochromatic) — brand-primary is forbidden on content pages.
 */
const PointsBadge = ({ points }: { points: number }) => {
  if (!points || points <= 0) return null;
  return (
    <div
      className="flex items-center gap-1.5"
      title={`${points} ${points === 1 ? "point" : "points"}`}
    >
      {Array.from({ length: points }).map((_, i) => (
        <div key={i} className="w-3 h-3 rounded-full bg-text-primary" />
      ))}
    </div>
  );
};

// aspectToken is only applied for compact/stack layouts — the hero grid fills
// the column by height naturally, so no explicit aspect ratio is needed there.
function mediaAspectClass(layout: CardLayout, isCarouselLayout: boolean): string {
  if (isCarouselLayout) return "";
  switch (layout) {
    case "media-forward":
      return "aspect-card-hero";
    case "compact-stack":
      return "aspect-card-compact";
    default:
      return "aspect-card-standard";
  }
}

function reviewBodyClampClass(textWeight: CardTextWeight, essayExpanded: boolean): string {
  switch (textWeight) {
    case "none":
      return "";
    case "snippet":
      return "line-clamp-card-snippet";
    case "body":
      return "line-clamp-card-body";
    case "essay":
      return essayExpanded ? "" : "line-clamp-card-body";
    default:
      return "";
  }
}

export interface ReviewCardFeedProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
  variant?: "default" | "compact";
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  imagePosition?: "left" | "right";
  showCommunityImages?: boolean;
  /** When omitted, layout is derived via {@link resolveCardSpec}(entry). */
  spec?: CardSpec;
  /** When set, replaces `spec.prominence` / resolver prominence — for playground / forced treatments. */
  prominenceOverride?: CardProminence;
}

/**
 * Feed / discovery / profile-grid review card (non-detail). Default variant layout uses {@link resolveCardSpec}.
 *
 * Design: A24 editorial — white canvas, aggressive typographic hierarchy, zero decorative chrome.
 * Hero (default) cards use a true 50/50 CSS grid split so photography fills half the viewport,
 * not a narrow 280px sidebar. No box shadows. Sharp image edges. Generous text column padding.
 */
export function ReviewCardFeed({
  entry,
  onLike,
  onImageLike,
  onComment,
  variant = "default",
  hideUser = false,
  hideBuildingInfo = false,
  imagePosition = "left",
  showCommunityImages = true,
  spec: specProp,
  prominenceOverride,
}: ReviewCardFeedProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const isCompact = variant === "compact";
  const effectiveSpec = useMemo((): CardSpec => {
    const base = specProp ?? resolveCardSpec(entry);
    if (prominenceOverride != null) {
      return { ...base, prominence: prominenceOverride };
    }
    return base;
  }, [entry, specProp, prominenceOverride]);
  const { data, failedImages, setFailedImages } = useReviewCardData(entry, {
    variant,
    showCommunityImages,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [essayExpanded, setEssayExpanded] = useState(false);

  useEffect(() => {
    setEssayExpanded(false);
  }, [entry.id]);

  if (!data) return null;

  const isSavedToList =
    entry.building?.id != null && statuses[entry.building.id] === "pending";

  const {
    username,
    isVerifiedArchitect,
    isArchitectOfBuilding,
    mainTitle,
    subTitle,
    posterUrl,
    mediaItems,
    carouselImages,
    hasVideo,
    city,
  } = data;

  const imageOnlyItems = mediaItems.filter((m) => m.type === "image");
  const hasMedia =
    !hideBuildingInfo && (mediaItems.length > 0 || (!!posterUrl && showCommunityImages));
  const showCarousel =
    !hideBuildingInfo &&
    !hasVideo &&
    effectiveSpec.imageWeight === "gallery" &&
    imageOnlyItems.length > 2;
  const showPairGrid =
    !hideBuildingInfo &&
    !hasVideo &&
    effectiveSpec.imageWeight === "pair" &&
    imageOnlyItems.length >= 2;
  const bodyClampClass = reviewBodyClampClass(effectiveSpec.textWeight, essayExpanded);
  const showReadMore =
    !isCompact &&
    effectiveSpec.textWeight === "essay" &&
    !essayExpanded &&
    Boolean(entry.content?.trim());
  const useCompactStackLayout = !isCompact && effectiveSpec.layout === "compact-stack";

  // aspectToken only used for compact/stack layouts — hero grid fills column height naturally.
  const aspectToken =
    (useCompactStackLayout || isCompact) && !showCarousel && !showPairGrid
      ? mediaAspectClass(effectiveSpec.layout, showCarousel)
      : "";

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;
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
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".video-container")) return;
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

  // ── renderMediaItem ─────────────────────────────────────────────────────────
  // rounded-none on images: sharp edges like printed photographs in a magazine.
  const renderMediaItem = (
    item: ReviewCardMediaItem,
    className?: string,
    overlay?: React.ReactNode,
  ) => (
    <div key={item.id} className={`relative w-full h-full min-w-0 overflow-hidden rounded-none ${className || ""}`}>
      <div className="absolute inset-0 w-full h-full">
        {item.type === "video" ? (
          <div className="w-full h-full video-container overflow-hidden">
            <VideoPlayer
              src={item.url}
              poster={item.poster}
              className="w-full h-full transition-transform duration-500 hover:scale-105"
              autoPlayOnVisible={true}
              muted={true}
              objectFit="cover"
            />
          </div>
        ) : !failedImages.has(item.id) ? (
          <img
            src={item.url}
            alt="Review photo"
            className="w-full h-full object-cover rounded-none transition-transform duration-500 hover:scale-105"
            onError={() => setFailedImages((prev) => new Set(prev).add(item.id))}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary bg-surface-muted/50">
            <ImageIcon className="w-4 h-4 opacity-50" />
          </div>
        )}
      </div>
      {overlay && <div className="absolute inset-0 z-10">{overlay}</div>}
    </div>
  );

  const userActionVerb = entry.status === "pending" ? "wants to visit" : "visited";

  // ── Activity lead ───────────────────────────────────────────────────────────
  // Replaces category labels ("Review" / "Building"): who did what, above the title.
  const ActivityLead = !hideUser && (
    <p
      className={cn(
        "font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary min-w-0",
        !isCompact ? "mb-2" : "mb-1",
      )}
    >
      <span className="font-medium text-text-primary">{username}</span>
      <span className="text-text-secondary normal-case"> {userActionVerb}</span>
    </p>
  );

  // ── Byline ──────────────────────────────────────────────────────────────────
  // Architect badge, follow CTA, timestamp — username lives on ActivityLead only.
  const Byline = !hideUser && (
    <div className="flex items-center gap-2 min-w-0">
      {isVerifiedArchitect && (
        <span className="font-mono text-[9px] tracking-[0.1em] uppercase border border-text-primary text-text-primary px-1.5 py-0.5 font-bold shrink-0 leading-none">
          Architect
        </span>
      )}
      {entry.is_suggested && entry.user_id && (
        <span className="shrink-0">
          <FollowButton userId={entry.user_id} hideIfFollowing className="h-5 text-[10px] px-2" />
        </span>
      )}
      <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text-secondary/40 ml-auto shrink-0">
        {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
      </span>
    </div>
  );

  // ── Building headline ───────────────────────────────────────────────────────
  // Only rendered when !hideBuildingInfo (e.g. suppressed on building detail page).
  // Scales with prominence: elevated → editorial hero size; standard → display size.
  const BuildingHeadline = !hideBuildingInfo && (
    <div>
      <h2
        className={`font-sans font-black tracking-tight leading-none text-text-primary ${
          isCompact
            ? "text-lg leading-tight"
            : effectiveSpec.prominence === "elevated"
            ? "text-6xl md:text-7xl mb-1.5"
            : "text-4xl md:text-5xl mb-1"
        }`}
      >
        {mainTitle}
      </h2>
      {(subTitle || city) && (
        <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary mt-1">
          {[subTitle, city].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );

  // ── Media (compact / stack variants) ────────────────────────────────────────
  // Used by the compact variant and compact-stack layout only.
  // For the hero grid, media is rendered inline in the image column below.
  // Pair grid: 2px gap between cells (contact-sheet style, no rounded corners).
  const MediaCompact = !hideBuildingInfo && (
    mediaItems.length > 0 ? (
      showCarousel ? (
        <FeedPhotoCarousel
          images={carouselImages}
          reviewId={entry.id}
          onImageLike={onImageLike}
          className="w-full"
        />
      ) : showPairGrid ? (
        <div className="grid grid-cols-2 gap-[2px] w-full max-w-full min-w-0 overflow-hidden rounded-none bg-surface-muted">
          <div className="relative aspect-card-compact min-w-0 overflow-hidden rounded-none">
            {renderMediaItem(imageOnlyItems[0], "h-full")}
          </div>
          <div className="relative aspect-card-compact min-w-0 overflow-hidden rounded-none">
            {renderMediaItem(imageOnlyItems[1], "h-full")}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative w-full max-w-full min-w-0 overflow-hidden rounded-none bg-surface-muted",
            aspectToken,
          )}
        >
          <div className="absolute inset-0 w-full h-full">{renderMediaItem(mediaItems[0])}</div>
        </div>
      )
    ) : posterUrl && showCommunityImages ? (
      <div
        className={cn(
          "relative w-full max-w-full min-w-0 bg-surface-muted overflow-hidden rounded-none",
          aspectToken || "aspect-[4/3]",
        )}
      >
        <img
          src={posterUrl}
          alt={mainTitle || ""}
          className="w-full h-full object-cover rounded-none transition-transform duration-500 group-hover/card:scale-105"
        />
      </div>
    ) : null
  );

  // ── Media (hero grid) ────────────────────────────────────────────────────────
  // Rendered directly inside the image column of the 50/50 grid.
  // No fixed width, no aspect token — fills the grid cell height naturally.
  const renderHeroMedia = () => {
    if (!hasMedia) return null;
    if (showCarousel) {
      return (
        <FeedPhotoCarousel
          images={carouselImages}
          reviewId={entry.id}
          onImageLike={onImageLike}
          className="w-full h-full"
        />
      );
    }
    if (showPairGrid) {
      return (
        <div className="grid grid-cols-2 gap-[2px] w-full h-full min-h-[300px] md:min-h-[460px] bg-surface-muted rounded-none">
          <div className="relative min-w-0 overflow-hidden rounded-none">
            {renderMediaItem(imageOnlyItems[0], "h-full")}
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-none">
            {renderMediaItem(imageOnlyItems[1], "h-full")}
          </div>
        </div>
      );
    }
    if (mediaItems.length > 0) {
      return (
        <div className="relative w-full h-full min-h-[300px] md:min-h-[460px] bg-surface-muted rounded-none">
          <div className="absolute inset-0 w-full h-full">{renderMediaItem(mediaItems[0])}</div>
        </div>
      );
    }
    if (posterUrl && showCommunityImages) {
      return (
        <div className="relative w-full h-full min-h-[300px] md:min-h-[460px] bg-surface-muted rounded-none">
          <img
            src={posterUrl}
            alt={mainTitle || ""}
            className="absolute inset-0 w-full h-full object-cover rounded-none transition-transform duration-500 group-hover/card:scale-105"
          />
        </div>
      );
    }
    return null;
  };

  // ── Content body ─────────────────────────────────────────────────────────────
  // Compact variant: quoted excerpt in medium weight.
  // Default variant: text-base (16px) for editorial readability — not text-sm.
  const ContentBody = isCompact ? (
    <>
      {entry.content && (
        <div className="min-w-0">
          <p className={`text-sm font-medium text-text-primary leading-relaxed break-words ${bodyClampClass}`}>
            "{entry.content}"
          </p>
          {effectiveSpec.textWeight === "essay" && !essayExpanded && entry.content.trim() && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEssayExpanded(true);
              }}
              className="mt-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-text-primary hover:text-text-secondary transition-colors"
            >
              Read more →
            </button>
          )}
        </div>
      )}
    </>
  ) : (
    <>
      {entry.content && (
        <div className="min-w-0">
          <p className={`text-base text-text-primary leading-relaxed break-words ${bodyClampClass}`}>
            {entry.content}
          </p>
          {showReadMore && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEssayExpanded(true);
              }}
              className="mt-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-text-primary hover:text-text-secondary transition-colors"
            >
              Read more →
            </button>
          )}
        </div>
      )}
    </>
  );

  // ── Footer ───────────────────────────────────────────────────────────────────
  // Likes / comments in mono; save is a bookmark (desktop: show on card hover).
  const Footer = (
    <div
      className={`flex w-full max-w-full min-w-0 items-center gap-3 flex-wrap mt-auto ${
        isCompact ? "pt-3" : "pt-4"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLike?.(entry.id);
          window.dispatchEvent(new CustomEvent("pwa-interaction"));
        }}
        className={`font-mono text-[10px] tracking-[0.12em] uppercase transition-colors ${
          entry.is_liked
            ? "text-text-primary"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        {entry.likes_count} {entry.likes_count === 1 ? "like" : "likes"}
      </button>
      <span className="text-text-secondary/30 select-none text-xs">·</span>
      <button
        onClick={handleCommentClick}
        className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary hover:text-text-primary transition-colors"
      >
        {entry.comments_count} {entry.comments_count === 1 ? "comment" : "comments"}
      </button>
      {!isCompact && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label={isSavedToList ? "Saved to your list" : "Save building to your list"}
          title={isSavedToList ? "Saved to your list" : "Save to your list"}
          className={cn(
            "ml-auto shrink-0 rounded-sm p-1 text-text-secondary transition-colors hover:text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1",
            "opacity-100 md:opacity-0 md:transition-opacity md:group-hover/card:opacity-100 md:focus-visible:opacity-100",
            isSaving && "pointer-events-none opacity-50",
          )}
        >
          <Bookmark
            className={cn(
              "h-4 w-4",
              isSavedToList && "fill-text-primary text-text-primary",
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
      <article
        data-testid={`review-card-feed-${entry.id}`}
        onClick={handleCardClick}
        className={cn(
          "group/card relative w-full cursor-pointer min-w-0",
          // Architect-of-building indicator: left rule, no padding bleed into image column.
          isArchitectOfBuilding && "border-l-2 border-l-text-primary",
        )}
      >
        {/* ── Compact variant ── */}
        {isCompact ? (
          <div className={cn("flex flex-col h-full", isArchitectOfBuilding && "pl-3 md:pl-4")}>
            {MediaCompact}
            {/* Text lives in its own padded sub-div — image is flush to card edges. */}
            <div className="flex flex-col flex-1 min-w-0 px-3 py-2.5 gap-2">
              {ActivityLead}
              {Byline}
              {BuildingHeadline}
              {entry.rating != null && entry.rating > 0 && (
                <PointsBadge points={entry.rating} />
              )}
              {ContentBody}
              {Footer}
            </div>
          </div>

        /* ── Compact-stack layout ── */
        ) : useCompactStackLayout ? (
          <div className={cn("flex flex-col", isArchitectOfBuilding && "pl-3 md:pl-4")}>
            <div className="flex flex-col gap-3">
              {ActivityLead}
              {Byline}
              {BuildingHeadline}
              {entry.rating != null && entry.rating > 0 && (
                <PointsBadge points={entry.rating} />
              )}
            </div>
            {MediaCompact}
            <div className="flex flex-col flex-1 min-w-0 pt-3 gap-2">
              {ContentBody}
              {Footer}
            </div>
          </div>

        /* ── Hero grid (default, non-compact) ── */
        /* True 50/50 CSS grid — magazine spread. No box shadow, no fixed image width. */
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 gap-0 items-stretch",
              hasMedia && "md:grid-cols-2",
              isArchitectOfBuilding && "pl-3 md:pl-4",
            )}
          >
            {/* Image column — full 50% width, generous min-height for photography */}
            {hasMedia && (
              <div
                className={cn(
                  "relative overflow-hidden rounded-none",
                  imagePosition === "right" ? "md:order-2" : "md:order-1",
                )}
              >
                {renderHeroMedia()}
              </div>
            )}

            {/* Text column — generous padding mirrors FeedHeroCard's editorial rhythm */}
            <div
              className={cn(
                "flex flex-col justify-center gap-3",
                hasMedia
                  ? imagePosition === "right"
                    ? "md:order-1 px-0 py-6 md:py-10 md:pr-10"
                    : "md:order-2 px-0 py-6 md:py-10 md:pl-10"
                  : "max-w-xl",
              )}
            >
              {ActivityLead}
              {Byline}
              {BuildingHeadline}
              {entry.rating != null && entry.rating > 0 && (
                <PointsBadge points={entry.rating} />
              )}
              {ContentBody}
              {Footer}
            </div>
          </div>
        )}
      </article>
    </SuggestedContentBlock>
  );
}