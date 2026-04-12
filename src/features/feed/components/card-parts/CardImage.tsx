import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FeedPhotoCarousel, type CarouselImage } from "@/features/feed/components/FeedPhotoCarousel";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import type { ReviewCardMediaItem } from "@/features/feed/hooks/useReviewCardData";

export interface CardImageProps {
  items: ReviewCardMediaItem[];
  height: number;
  className?: string;
  reviewId: string;
  onImageLike?: (reviewId: string, imageId: string) => void;
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
    likes_count: 0,
    is_liked: false,
  }));
}

/**
 * Fixed-height media block: empty placeholder, single image/video, pair grid, or carousel.
 */
export function CardImage({
  items,
  height,
  className,
  reviewId,
  onImageLike,
}: CardImageProps) {
  const allImages = useMemo(() => items.filter((i) => i.type === "image"), [items]);
  const hasVideo = items.some((i) => i.type === "video");
  const videoItem = items.find((i) => i.type === "video");

  const containerStyle = { height: `${height}px` } as const;

  const outer = (inner: ReactNode) => (
    <div
      className={cn("relative w-full overflow-hidden rounded-none bg-surface-muted", className)}
      style={containerStyle}
    >
      {inner}
    </div>
  );

  if (items.length === 0) {
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
  if (hasVideo && videoItem && items.length === 3 && allImages.length === 2) {
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
  if (items.length === 2) {
    return outer(
      <div className="grid h-full w-full grid-cols-2 gap-[2px]">
        <div className="relative min-h-0 min-w-0 overflow-hidden">
          {items[0].type === "video" ? (
            <div className="relative h-full w-full overflow-hidden">
              <VideoPlayer
                src={items[0].url}
                poster={items[0].poster}
                className="h-full w-full"
                autoPlayOnVisible={true}
                muted={true}
                objectFit="cover"
              />
            </div>
          ) : (
            <FadeInImg src={items[0].url} alt="Building" className="h-full" />
          )}
        </div>
        <div className="relative min-h-0 min-w-0 overflow-hidden">
          {items[1].type === "video" ? (
            <div className="relative h-full w-full overflow-hidden">
              <VideoPlayer
                src={items[1].url}
                poster={items[1].poster}
                className="h-full w-full"
                autoPlayOnVisible={true}
                muted={true}
                objectFit="cover"
              />
            </div>
          ) : (
            <FadeInImg src={items[1].url} alt="Building" className="h-full" />
          )}
        </div>
      </div>,
    );
  }

  // Single item
  const only = items[0];
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
