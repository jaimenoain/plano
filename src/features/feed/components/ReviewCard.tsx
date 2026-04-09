import { useState } from "react";
import { Heart, MessageCircle, Circle, Image as ImageIcon, Bookmark, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { SuggestedContentBlock } from "./SuggestedContentBlock";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { FeedPhotoCarousel } from "./FeedPhotoCarousel";

function getCityFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
      return parts[parts.length - 2];
  }
  return parts[0];
}

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

interface ReviewCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
  isDetailView?: boolean;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  imagePosition?: 'left' | 'right';
  variant?: 'default' | 'compact';
  showCommunityImages?: boolean;
}

export function ReviewCard({ 
  entry,
  onLike,
  onImageLike,
  onComment, 
  isDetailView = false, 
  hideUser = false,
  hideBuildingInfo = false,
  imagePosition = 'left',
  variant = 'default',
  showCommunityImages = true
}: ReviewCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  if (!entry.building) return null;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_buildings").upsert({
          user_id: user.id,
          building_id: entry.building.id,
          status: 'pending',
          edited_at: new Date().toISOString()
      }, { onConflict: 'user_id, building_id' });
      if (error) throw error;
      toast({ title: "Saved to your list" });
    } catch (_error) {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  };

  const posterUrl = getBuildingImageUrl(entry.building.main_image_url);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDetailView) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.video-container')) return;
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

  const username = entry.user?.username || "Unknown User";
  const avatarUrl = entry.user?.avatar_url || undefined;
  const isVerifiedArchitect = entry.user?.is_verified_architect || false;
  const isArchitectOfBuilding = entry.user?.is_architect_of_building || false;
  const userInitial = username.charAt(0).toUpperCase();

  const mainTitle = entry.building.name;
  const credits = entry.building.creditedEntities;
  const year_completed = entry.building.year_completed;
  const creditNames = credits ? credits.map((c) => c.name).filter(Boolean) : [];

  let subTitle = entry.building.address;
  if (variant === 'compact') {
      const parts: (string | number)[] = [];
      if (creditNames.length > 0) parts.push(creditNames.slice(0, 2).join(", "));
      if (year_completed) parts.push(year_completed);
      subTitle = parts.length > 0 ? parts.join(" • ") : entry.building.address;
  } else {
      const creditsList = creditNames.slice(0, 2).join(", ");
      if (creditsList) {
          subTitle = creditsList;
          if (year_completed) subTitle += ` • ${year_completed}`;
      } else if (year_completed) {
          subTitle = `${year_completed}`;
          if (entry.building.address) subTitle += ` • ${entry.building.address}`;
      }
  }

  // ── Media preparation ──────────────────────────────────────────────────────
  interface MediaItem {
    id: string;
    type: 'video' | 'image';
    url: string;
    poster?: string;
  }

  const mediaItems: MediaItem[] = [];
  if (entry.video_url) {
      mediaItems.push({
          id: `video-${entry.id}`,
          type: 'video',
          url: entry.video_url,
          poster:
            entry.images && entry.images.length > 0
              ? entry.images[0].url
              : showCommunityImages
                ? posterUrl || undefined
                : undefined,
      });
  }
  if (entry.images && entry.images.length > 0) {
      entry.images.forEach(img => {
          mediaItems.push({ id: img.id, type: 'image', url: img.url });
      });
  }

  // Use carousel when there are multiple user-uploaded images and no video
  const imageOnlyItems = mediaItems.filter(m => m.type === 'image');
  const hasVideo = mediaItems.some(m => m.type === 'video');
  const useCarousel = !hasVideo && imageOnlyItems.length > 1;

  // Carousel-compatible images (ReviewImage shape expected by FeedPhotoCarousel)
  const carouselImages = (entry.images || []).map(img => ({
    id: img.id,
    url: img.url,
    likes_count: img.likes_count,
    is_liked: img.is_liked,
  }));

  const hasMedia = !hideBuildingInfo && (mediaItems.length > 0 || !!posterUrl);
  const isCompact = variant === 'compact';
  const flexDirection = imagePosition === 'right' ? 'md:flex-row' : 'md:flex-row-reverse';

  // ── Detail view ────────────────────────────────────────────────────────────
  if (isDetailView) {
    return (
      <article className="px-4 py-4 hairline">
        {!hideUser ? (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-surface-muted text-text-primary text-sm">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{username}</p>
              <p className="text-xs text-text-secondary">
                {formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace("about ", "")}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <p className="text-xs text-text-secondary">
              {formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace("about ", "")}
            </p>
          </div>
        )}
        <div className="flex gap-3">
          {!hideBuildingInfo && (
            mediaItems.length > 0 && mediaItems[0].type === 'video' ? (
                <div className="w-32 h-24 bg-black rounded-sm flex-shrink-0 video-container">
                    <VideoPlayer
                        src={mediaItems[0].url}
                        poster={mediaItems[0].poster}
                        className="w-full h-full"
                        autoPlayOnVisible={false}
                        muted={true}
                        objectFit="cover"
                    />
                </div>
            ) : mediaItems.length > 0 ? (
                <img
                    src={mediaItems[0].url}
                    alt={entry.building.name}
                    className="w-32 h-24 object-cover rounded-sm flex-shrink-0"
                />
            ) : posterUrl ? (
              <img
                src={posterUrl}
                alt={entry.building.name}
                className="w-32 h-24 object-cover rounded-sm flex-shrink-0"
              />
            ) : (
              <div className="w-32 h-24 bg-surface-muted rounded-sm flex-shrink-0 flex items-center justify-center">
                <span className="text-xs text-text-secondary">No image</span>
              </div>
            )
          )}
          <div className="flex-1 min-w-0">
            {!hideBuildingInfo && (
              <div className="mb-2">
                <h3 className="text-base font-semibold text-text-primary truncate">{mainTitle}</h3>
                {subTitle && <p className="text-xs text-text-secondary truncate">{subTitle}</p>}
              </div>
            )}
            {entry.rating && entry.rating > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <RatingCircles rating={entry.rating} />
              </div>
            )}
            {entry.content && (
              <p className="text-sm text-text-secondary mb-2 break-words">{entry.content}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 mt-3 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onLike?.(entry.id); window.dispatchEvent(new CustomEvent('pwa-interaction')); }}
            className="flex items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors"
          >
            <Heart className={`h-4 w-4 ${entry.is_liked ? "fill-brand-primary text-brand-primary" : ""}`} />
            <span className="text-xs">{entry.likes_count}</span>
          </button>
          <button onClick={handleCommentClick} className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{entry.comments_count}</span>
          </button>
        </div>
      </article>
    );
  }

  // ── Non-detail view ────────────────────────────────────────────────────────
  const city = getCityFromAddress(entry.building.address);
  const action = entry.status === 'pending' ? 'saved' : 'visited';

  const renderMediaItem = (item: MediaItem, className?: string, overlay?: React.ReactNode) => (
    <div key={item.id} className={`relative w-full h-full min-w-0 overflow-hidden ${className || ''}`}>
      <div className="absolute inset-0 w-full h-full">
        {item.type === 'video' ? (
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
        ) : (
          !failedImages.has(item.id) ? (
            <img
              src={item.url}
              alt="Review photo"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              onError={() => setFailedImages(prev => new Set(prev).add(item.id))}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary bg-surface-muted/50">
              <ImageIcon className="w-4 h-4 opacity-50" />
            </div>
          )
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
            <span className="font-semibold text-text-primary truncate block md:inline md:w-auto md:max-w-none min-w-0 flex-1 md:flex-none">{mainTitle}</span>
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

  // ── Media block: carousel for multi-image, existing logic otherwise ────────
  const Media = !hideBuildingInfo && (
    mediaItems.length > 0 ? (
      useCarousel ? (
        // Multi-image, no video: full-bleed carousel
        <FeedPhotoCarousel
          images={carouselImages}
          reviewId={entry.id}
          onImageLike={onImageLike}
          className="w-full"
        />
      ) : (
        // Single image or video: keep the side-panel layout
        <div
          className={`relative w-full max-w-full min-w-0 overflow-hidden bg-surface-muted ${
            !isCompact ? "md:w-[280px] md:shrink-0 aspect-[4/3] md:aspect-auto" : "aspect-[4/3]"
          }`}
        >
          <div className="absolute inset-0 w-full h-full">
            {renderMediaItem(mediaItems[0])}
          </div>
        </div>
      )
    ) : posterUrl && showCommunityImages ? (
      <div
        className={`relative w-full max-w-full min-w-0 bg-surface-muted overflow-hidden aspect-[4/3] ${
          !isCompact ? "md:aspect-auto md:w-[280px] md:shrink-0" : ""
        }`}
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
            <div className="flex items-center gap-1 mt-1"><RatingCircles rating={entry.rating} /></div>
          )}
        </div>
      )}
      {entry.content && (
        <p className="text-sm font-medium text-text-primary line-clamp-3 leading-relaxed">
          "{entry.content}"
        </p>
      )}
    </>
  ) : (
    <>
      {entry.content && (
        <p className="text-sm text-text-primary mb-2 leading-relaxed break-words">{entry.content}</p>
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
        onClick={(e) => { e.stopPropagation(); onLike?.(entry.id); window.dispatchEvent(new CustomEvent("pwa-interaction")); }}
        className="flex items-center gap-1.5 text-text-secondary hover:text-brand-primary transition-colors group/like"
      >
        <Heart className={`h-4 w-4 transition-transform group-hover/like:scale-110 ${entry.is_liked ? "fill-brand-primary text-brand-primary" : ""}`} />
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

  // When carousel is used, the card is always full-width vertical (not side-by-side)
  const cardLayoutClass = !isCompact && hasMedia && !useCarousel ? `${flexDirection} md:min-h-[220px]` : "";

  return (
    <SuggestedContentBlock isSuggested={entry.is_suggested} suggestionReason={entry.suggestion_reason}>
      <article
        onClick={handleCardClick}
        className={`group/card relative flex flex-col ${cardLayoutClass} h-full bg-surface-card border border-border-default rounded-sm overflow-hidden shadow-none hover:border-border-strong transition-colors cursor-pointer min-w-0 w-full max-w-full ${
          isArchitectOfBuilding ? "border-l-2 border-l-brand-primary" : ""
        }`}
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