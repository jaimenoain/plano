import { useEffect, useMemo, useState } from "react";
import { Heart, MessageCircle, Circle, Image as ImageIcon, Bookmark, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const RatingCircles = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Circle
          key={i}
          className={`w-3 h-3 ${
            i < rating
              ? "fill-brand-primary text-text-primary"
              : "fill-transparent text-text-secondary/20"
          }`}
        />
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
    avatarUrl,
    userInitial,
    isVerifiedArchitect,
    isArchitectOfBuilding,
    mainTitle,
    subTitle,
    posterUrl,
    mediaItems,
    carouselImages,
    hasVideo,
    city,
    action,
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
  const showReadMore = !isCompact && effectiveSpec.textWeight === "essay" && !essayExpanded && Boolean(entry.content?.trim());
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

  const renderMediaItem = (item: ReviewCardMediaItem, className?: string, overlay?: React.ReactNode) => (
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

  const Header = !hideUser && (
    <div className="p-3 md:p-4 flex items-center gap-3 border-b border-border-default/40">
      <Avatar className="h-10 w-10 border border-border-default/50 shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback>{userInitial}</AvatarFallback>
      </Avatar>
      <div className="text-sm md:text-base text-text-primary leading-snug min-w-0 max-w-full flex-1 break-words">
        <div className="flex flex-col gap-0.5 md:block min-w-0">
          <div className="flex items-center gap-2 min-w-0 md:inline md:gap-0">
            <span className="font-semibold truncate md:text-clip min-w-0">{username}</span>
            {isVerifiedArchitect && (
              <div className="inline-flex items-center text-text-primary ml-1 align-middle" title="Verified Architect">
                <BadgeCheck className="w-4 h-4" />
              </div>
            )}
            {entry.is_suggested && entry.user_id && (
              <span className="md:inline-block md:ml-2 min-w-0">
                <FollowButton userId={entry.user_id} hideIfFollowing className="h-5 text-[10px] px-2" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 min-w-0 md:inline md:gap-0">
            <span className="text-text-secondary/60 font-normal md:ml-1 shrink-0"> {action} </span>
            <span
              className={`truncate block md:inline md:w-auto md:max-w-none min-w-0 flex-1 md:flex-none ${
                !isCompact && effectiveSpec.prominence === "elevated"
                  ? "font-bold text-text-primary"
                  : "font-semibold text-text-primary"
              }`}
            >
              {mainTitle}
            </span>
            {city && <span className="text-text-secondary hidden md:inline"> in {city}</span>}
          </div>
          <div className="flex items-center gap-1 min-w-0 md:inline md:gap-0">
            {entry.rating && entry.rating > 0 && (
              <span className="inline-flex items-center gap-0.5 align-middle md:ml-2 shrink-0">
                <RatingCircles rating={entry.rating} />
              </span>
            )}
            <span className="text-text-secondary text-xs md:ml-2 shrink min-w-0 truncate">
              {!(entry.rating && entry.rating > 0) && <span className="hidden md:inline">• </span>}
              {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
            </span>
          </div>
        </div>
      </div>
    </div>
  );

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
          className={`grid grid-cols-2 w-full max-w-full min-w-0 overflow-hidden bg-surface-muted ${
            !isCompact ? "md:w-[280px] md:shrink-0" : ""
          }`}
        >
          <div className="relative aspect-card-compact min-w-0 overflow-hidden">
            {renderMediaItem(imageOnlyItems[0], "h-full")}
          </div>
          <div className="relative aspect-card-compact min-w-0 overflow-hidden border-l border-border-default/30">
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

  const ContentBody = isCompact ? (
    <>
      {!hideBuildingInfo && (
        <div className="mb-1">
          <h3 className="text-base font-bold text-text-primary line-clamp-2 leading-tight">{mainTitle}</h3>
          {subTitle && <p className="text-xs text-text-secondary line-clamp-1 truncate">{subTitle}</p>}
          {hideUser && entry.rating && entry.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <RatingCircles rating={entry.rating} />
            </div>
          )}
        </div>
      )}
      {entry.content && (
        <div className="min-w-0">
          <p
            className={`text-sm font-medium text-text-primary leading-relaxed break-words ${bodyClampClass}`}
          >
            "{entry.content}"
          </p>
          {effectiveSpec.textWeight === "essay" && !essayExpanded && entry.content.trim() && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEssayExpanded(true);
              }}
              className="mt-1 text-xs font-medium uppercase tracking-widest text-text-primary hover:text-text-secondary"
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
        <div className="mb-2 min-w-0">
          <p className={`text-sm text-text-primary leading-relaxed break-words ${bodyClampClass}`}>{entry.content}</p>
          {showReadMore && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEssayExpanded(true);
              }}
              className="mt-1 text-xs font-medium uppercase tracking-widest text-text-primary hover:text-text-secondary"
            >
              Read more →
            </button>
          )}
        </div>
      )}
    </>
  );

  const Footer = (
    <div
      className={`flex w-full max-w-full min-w-0 items-center gap-2 md:gap-4 flex-wrap ${
        isCompact ? "p-2.5 md:p-4 pt-3 mt-auto border-t border-border-default/50" : "mt-auto pt-3 border-t border-border-default/50"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLike?.(entry.id);
          window.dispatchEvent(new CustomEvent("pwa-interaction"));
        }}
        className="flex items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors group/like"
      >
        <Heart
          className={`h-4 w-4 transition-transform group-hover/like:scale-110 ${entry.is_liked ? "fill-brand-primary text-brand-primary" : ""}`}
        />
        <span className="text-xs font-medium">{entry.likes_count}</span>
      </button>
      <button
        onClick={handleCommentClick}
        className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors group/comment"
      >
        <MessageCircle className="h-4 w-4 transition-transform group-hover/comment:scale-110" />
        <span className="text-xs font-medium">{entry.comments_count}</span>
      </button>
      {!isCompact && (
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors ml-auto ${isSaving ? "opacity-50" : ""}`}
          disabled={isSaving}
        >
          <Bookmark className="h-4 w-4" />
          <span className="text-xs font-medium">Save</span>
        </button>
      )}
    </div>
  );

  const cardLayoutClass = useMdSideBySide ? `${flexDirection} md:min-h-[220px]` : "";
  const prominenceElevated = !isCompact && effectiveSpec.prominence === "elevated";

  return (
    <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
      <article
        data-testid={`review-card-feed-${entry.id}`}
        onClick={handleCardClick}
        className={`group/card relative flex flex-col ${cardLayoutClass} h-full bg-surface-card border border-border-default rounded-sm overflow-hidden hover:border-border-strong transition-colors cursor-pointer min-w-0 w-full max-w-full ${
          isArchitectOfBuilding ? "border-l-2 border-l-brand-primary" : ""
        } ${prominenceElevated ? "shadow-card-elevated" : "shadow-none"}`}
      >
        {isCompact ? (
          <>
            {Media}
            {Header}
            <div className="flex flex-col flex-1 min-w-0 p-2.5 md:p-4 md:pt-3 gap-2">
              {ContentBody}
            </div>
            {Footer}
          </>
        ) : useCompactStackLayout ? (
          <>
            {Header}
            {Media}
            <div className="flex flex-col flex-1 min-w-0 p-2.5 md:p-4 md:pt-3 gap-2">
              {ContentBody}
              {Footer}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col flex-1 min-w-0">
              {Header}
              <div className="flex flex-col flex-1 p-2.5 md:p-4 md:pt-3 gap-2">
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
