import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FeedPhotoCarousel, type CarouselImage } from "@/features/posts/components/FeedPhotoCarousel";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import type { ReviewCardMediaItem } from "@/features/posts/hooks/useReviewCardData";

export interface CardImageProps {
  items: ReviewCardMediaItem[];
  /** Fixed pixel height. Ignored when `aspectRatio` is provided. */
  height?: number;
  /** CSS aspect-ratio string (e.g. "16/9", "3/4"). Takes precedence over `height`. */
  aspectRatio?: string;
  className?: string;
  reviewId: string;
  onImageLike?: (reviewId: string, imageId: string) => void;
  /**
   * Type B feed: only the first media item fills the column (no carousel / multi-tile).
   */
  firstMediaOnly?: boolean;
}

function PlaceholderBlock({ className }: { className?: string }) {
  return <div className={cn("bg-surface-muted", className)} aria-hidden />;
}

function FadeInImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <PlaceholderBlock className={cn("absolute inset-0 h-full w-full", className)} />;
  }

  return (
    <div className={cn("relative h-full w-full min-h-0 overflow-hidden", className)}>
      {!loaded && <PlaceholderBlock className="absolute inset-0 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "h-full w-full origin-center object-cover rounded-none transition-[opacity,transform] duration-500 ease-out hover:scale-105",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

function toCarouselImages(images: ReviewCardMediaItem[]): CarouselImage[] {
  return images.map((img) => ({
    id: img.id,
    url: img.url,
    likes_count: img.likes_count ?? 0,
    is_liked: img.is_liked ?? false,
  }));
}

/**
 * Fixed-height or aspect-ratio media block: empty placeholder, single image/video, pair grid, or carousel.
 */
export function CardImage({
  items,
  height,
  aspectRatio,
  className,
  reviewId,
  onImageLike,
  firstMediaOnly = false,
}: CardImageProps) {
  const effectiveItems = useMemo(() => {
    if (firstMediaOnly && items.length > 0) return [items[0]];
    return items;
  }, [firstMediaOnly, items]);
  const allImages = useMemo(
    () => effectiveItems.filter((i) => i.type === "image"),
    [effectiveItems],
  );
  const hasVideo = effectiveItems.some((i) => i.type === "video");
  const videoItem = effectiveItems.find((i) => i.type === "video");

  const containerStyle: CSSProperties = aspectRatio
    ? { aspectRatio }
    : height != null
      ? { height: `${height}px` }
      : {};

  const outer = (inner: ReactNode) => (
    <div
      className={cn("relative w-full overflow-hidden rounded-none bg-surface-muted", className)}
      style={containerStyle}
    >
      {inner}
    </div>
  );

  if (effectiveItems.length === 0) {
    return outer(<PlaceholderBlock className="h-full w-full" />);
  }

  // Three or more still images — carousel (no video in strip).
  if (!hasVideo && allImages.length >= 3) {
    return outer(
      <FeedPhotoCarousel
        images={toCarouselImages(allImages)}
        reviewId={reviewId}
        onImageLike={onImageLike}
        className="h-full w-full"
      />,
    );
  }

  // Video + three or more images: split — video half height, carousel half height.
  if (hasVideo && videoItem && allImages.length >= 3) {
    return (
      <div
        className={cn("grid h-full w-full grid-rows-2 overflow-hidden rounded-none bg-surface-muted", className)}
        style={containerStyle}
      >
        <div className="min-h-0 overflow-hidden">
          <VideoPlayer
            src={videoItem.url}
            poster={videoItem.poster}
            className="h-full w-full"
            autoPlayOnVisible={true}
            muted={true}
            objectFit="cover"
          />
        </div>
        <div className="min-h-0 overflow-hidden">
          <FeedPhotoCarousel
            images={toCarouselImages(allImages)}
            reviewId={reviewId}
            onImageLike={onImageLike}
            className="h-full w-full"
          />
        </div>
      </div>
    );
  }

  // Video + exactly two images: stacked video then pair.
  if (hasVideo && videoItem && effectiveItems.length === 3 && allImages.length === 2) {
    return (
      <div
        className={cn("grid h-full w-full grid-rows-2 overflow-hidden rounded-none bg-surface-muted", className)}
        style={containerStyle}
      >
        <div className="min-h-0 overflow-hidden">
          <VideoPlayer
            src={videoItem.url}
            poster={videoItem.poster}
            className="h-full w-full"
            autoPlayOnVisible={true}
            muted={true}
            objectFit="cover"
          />
        </div>
        <div className="grid min-h-0 grid-cols-2 gap-[2px] overflow-hidden">
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            <FadeInImg src={allImages[0].url} alt="Building" className="h-full" />
          </div>
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            <FadeInImg src={allImages[1].url} alt="Building" className="h-full" />
          </div>
        </div>
      </div>
    );
  }

  // Two tiles: contact sheet (video and/or image).
  if (effectiveItems.length === 2) {
    return outer(
      <div className="grid h-full w-full grid-cols-2 gap-[2px]">
        <div className="relative min-h-0 min-w-0 overflow-hidden">
          {effectiveItems[0].type === "video" ? (
            <div className="relative h-full w-full overflow-hidden">
              <VideoPlayer
                src={effectiveItems[0].url}
                poster={effectiveItems[0].poster}
                className="h-full w-full"
                autoPlayOnVisible={true}
                muted={true}
                objectFit="cover"
              />
            </div>
          ) : (
            <FadeInImg src={effectiveItems[0].url} alt="Building" className="h-full" />
          )}
        </div>
        <div className="relative min-h-0 min-w-0 overflow-hidden">
          {effectiveItems[1].type === "video" ? (
            <div className="relative h-full w-full overflow-hidden">
              <VideoPlayer
                src={effectiveItems[1].url}
                poster={effectiveItems[1].poster}
                className="h-full w-full"
                autoPlayOnVisible={true}
                muted={true}
                objectFit="cover"
              />
            </div>
          ) : (
            <FadeInImg src={effectiveItems[1].url} alt="Building" className="h-full" />
          )}
        </div>
      </div>,
    );
  }

  // Single item
  const only = effectiveItems[0];
  return outer(
    only.type === "video" ? (
      <div className="relative h-full w-full overflow-hidden">
        <VideoPlayer
          src={only.url}
          poster={only.poster}
          className="h-full w-full"
          autoPlayOnVisible={true}
          muted={true}
          objectFit="cover"
        />
      </div>
    ) : (
      <FadeInImg src={only.url} alt="Building" className="h-full w-full" />
    ),
  );
}
