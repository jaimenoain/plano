import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
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
  const useMdSideBySide =
    !isCompact && hasMedia && !showCarousel && !useCompactStackLayout;

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

  const flexDirection = imagePosition === "right" ? "md:flex-row" : "md:flex-row-reverse";
  const aspectToken =
    !showCarousel && !showPairGrid ? mediaAspectClass(effectiveSpec.layout, showCarousel) : "";

  const renderMediaItem = (
    item: ReviewCardMediaItem,
    className?: string,
    overlay?: React.ReactNode,
  ) => (
    <div key={item.id} className={`relative w-full h-full min-w-0 overflow-hidden ${className || ""}`}>
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
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
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

  // ── Byline ──────────────────────────────────────────────────────────────────
  // Space Mono strip: NAME · [ARCHITECT badge] · [Follow] · timestamp.
  // Replaces the old avatar + "username reviewed Building" sentence header.
  const Byline = !hideUser && (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary font-medium truncate">
        {username}
      </span>
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
        className={`font-black tracking-tight leading-none text-text-primary ${
          isCompact
            ? "text-base leading-tight"
            : effectiveSpec.prominence === "elevated"
            ? "text-5xl md:text-6xl mb-1.5"
            : "text-2xl md:text-3xl mb-1"
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

  // ── Media ───────────────────────────────────────────────────────────────────
  // Pair grid: border-l divider replaced with a 2px gap (contact-sheet style).
  const Media = !hideBuildingInfo && (
    mediaItems.length > 0 ? (
      showCarousel ? (
        <FeedPhotoCarousel
          images={carouselImages}
          reviewId={entry.id}
          onImageLike={onImageLike}
          className="w-full"
        />
      ) : showPairGrid ? (
        <div
          className={`grid grid-cols-2 gap-[2px] w-full max-w-full min-w-0 overflow-hidden bg-surface-muted ${
            !isCompact ? "md:w-[280px] md:shrink-0" : ""
          }`}
        >
          <div className="relative aspect-card-compact min-w-0 overflow-hidden">
            {renderMediaItem(imageOnlyItems[0], "h-full")}
          </div>
          <div className="relative aspect-card-compact min-w-0 overflow-hidden">
            {renderMediaItem(imageOnlyItems[1], "h-full")}
          </div>
        </div>
      ) : (
        <div
          className={`relative w-full max-w-full min-w-0 overflow-hidden bg-surface-muted ${
            !isCompact
              ? `md:w-[280px] md:shrink-0 ${aspectToken} md:aspect-auto`
              : "aspect-[4/3]"
          }`}
        >
          <div className="absolute inset-0 w-full h-full">{renderMediaItem(mediaItems[0])}</div>
        </div>
      )
    ) : posterUrl && showCommunityImages ? (
      <div
        className={
          !isCompact
            ? `relative w-full max-w-full min-w-0 bg-surface-muted overflow-hidden md:w-[280px] md:shrink-0 ${aspectToken} md:aspect-auto`
            : "relative w-full max-w-full min-w-0 bg-surface-muted overflow-hidden aspect-[4/3]"
        }
      >
        <img
          src={posterUrl}
          alt={mainTitle || ""}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 ${
            !isCompact ? "md:absolute md:inset-0" : ""
          }`}
        />
      </div>
    ) : null
  );

  // ── Content body ─────────────────────────────────────────────────────────────
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
          <p className={`text-sm text-text-primary leading-relaxed break-words ${bodyClampClass}`}>
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
  // Text-only actions in Space Mono — no icons.
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
        {entry.likes_count} {entry.likes_count === 1 ? "note" : "notes"}
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
          onClick={handleSave}
          className={`font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary hover:text-text-primary transition-colors ml-auto ${
            isSaving ? "opacity-50" : ""
          }`}
          disabled={isSaving}
        >
          Save
        </button>
      )}
    </div>
  );

  const cardLayoutClass = useMdSideBySide ? `${flexDirection} md:min-h-[220px]` : "";

  return (
    <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
      <article
        data-testid={`review-card-feed-${entry.id}`}
        onClick={handleCardClick}
        className={`group/card relative flex flex-col ${cardLayoutClass} h-full cursor-pointer min-w-0 w-full max-w-full ${
          effectiveSpec.prominence === "elevated" ? "shadow-card-elevated" : ""
        } ${isArchitectOfBuilding ? "border-l-2 border-l-text-primary pl-3 md:pl-4" : ""}`}
      >
        {isCompact ? (
          <>
            {Media}
            <div className="flex flex-col flex-1 min-w-0 p-2.5 md:p-4 gap-2">
              {Byline}
              {BuildingHeadline}
              {entry.rating != null && entry.rating > 0 && (
                <PointsBadge points={entry.rating} />
              )}
              {ContentBody}
              {Footer}
            </div>
          </>
        ) : useCompactStackLayout ? (
          <>
            <div className="flex flex-col gap-3">
              {Byline}
              {BuildingHeadline}
              {entry.rating != null && entry.rating > 0 && (
                <PointsBadge points={entry.rating} />
              )}
            </div>
            {Media}
            <div className="flex flex-col flex-1 min-w-0 pt-3 gap-2">
              {ContentBody}
              {Footer}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex flex-col flex-1 gap-3">
                {Byline}
                {BuildingHeadline}
                {entry.rating != null && entry.rating > 0 && (
                  <PointsBadge points={entry.rating} />
                )}
                {ContentBody}
                {Footer}
              </div>
            </div>
            {Media}
          </>
        )}
      </article>
    </SuggestedContentBlock>
  );
}