import { type MouseEvent, useLayoutEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { cn } from "@/lib/utils";
import type { DetailCardVariant } from "@/types/cards";
import type { FeedReview, ReviewImage } from "@/types/feed";
import { useReviewCardData } from "@/features/feed/hooks/useReviewCardData";
import { CardImage, PointsBadge } from "@/features/feed/components/card-parts";
import { DetailCardFootnote } from "@/features/feed/components/detail/DetailCardFootnote";
import { DetailCardTextTreatmentBlock } from "@/features/feed/components/detail/DetailCardTextTreatmentBlock";
import { partitionDetailOverflowImages } from "@/features/feed/utils/resolveCardType";

const MD_MEDIA_QUERY = "(min-width: 768px)";

export interface DetailCardWithMediaProps {
  entry: FeedReview;
  variant: DetailCardVariant;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

function DetailOverflowImageCell({
  image,
  failedImages,
  onFail,
  className,
}: {
  image: ReviewImage;
  failedImages: Set<string>;
  onFail: (imageId: string) => void;
  className?: string;
}) {
  const failed = failedImages.has(image.id);
  const url = image.url?.trim() ?? "";

  if (failed || !url) {
    return (
      <div className={cn("h-[196px] min-h-0 min-w-0 bg-surface-muted", className)} aria-hidden />
    );
  }

  return (
    <div className={cn("relative h-[196px] min-h-0 min-w-0 overflow-hidden", className)}>
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover rounded-none"
        onError={() => onFail(image.id)}
      />
    </div>
  );
}

function DetailFullWidthHeroMedia({
  entry,
  failedImages,
  onImageFail,
}: {
  entry: FeedReview;
  failedImages: Set<string>;
  onImageFail: (imageId: string) => void;
}) {
  const hasVideo = Boolean(entry.video_url?.trim());
  const firstImage = entry.images?.[0];
  const imageUrl = firstImage?.url?.trim() ?? "";

  if (hasVideo && entry.video_url) {
    const poster =
      firstImage && imageUrl
        ? firstImage.url
        : undefined;
    return (
      <VideoPlayer
        src={entry.video_url}
        poster={poster}
        className="h-full w-full"
        autoPlayOnVisible={true}
        muted={true}
        objectFit="cover"
      />
    );
  }

  if (firstImage && imageUrl) {
    if (failedImages.has(firstImage.id)) {
      return <div className="h-full w-full bg-surface-muted" aria-hidden />;
    }
    return (
      <img
        src={firstImage.url}
        alt=""
        className="h-full w-full object-cover rounded-none"
        onError={() => onImageFail(firstImage.id)}
      />
    );
  }

  return <div className="h-full w-full bg-surface-muted" aria-hidden />;
}

/**
 * Building detail — review with media: first row + §4.3 byline + §4.4 copy + footnote; overflow grid §4.5.
 */
export function DetailCardWithMedia({
  entry,
  variant,
  onLike,
  onComment,
}: DetailCardWithMediaProps) {
  const navigate = useNavigate();
  const { data, failedImages, setFailedImages } = useReviewCardData(entry);
  const [isMd, setIsMd] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MD_MEDIA_QUERY);
    const sync = () => setIsMd(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!data) return null;

  const {
    username,
    avatarUrl,
    isVerifiedArchitect,
    isArchitectOfBuilding,
    mediaItems,
  } = data;

  const initial = username.trim().charAt(0).toUpperCase() || "?";
  const reviewDate = new Date(entry.edited_at || entry.created_at);
  const monthYear = format(reviewDate, "MMMM yyyy");
  const colHeight = variant.photoColHeight;

  const isFullWidthSingle = variant.mediaCount === 1 && variant.textTreatment === "none";
  const overflowImages = (entry.images ?? []).slice(1);
  const overflowRows = partitionDetailOverflowImages(overflowImages);

  const markImageFailed = (imageId: string) => {
    setFailedImages((prev) => new Set(prev).add(imageId));
  };

  const handleCardClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    navigate(`/review/${entry.id}`);
  };

  const bylineBlock = (
    <>
      <div className="flex min-w-0 shrink-0 items-start gap-3">
        <Avatar className="h-[52px] w-[52px] shrink-0 rounded-full border border-border-default bg-surface-muted">
          <AvatarImage src={avatarUrl || undefined} alt="" className="h-[52px] w-[52px]" />
          <AvatarFallback className="text-sm font-semibold text-text-secondary">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            to={`/profile/${username}`}
            className="block truncate text-xl font-black leading-none tracking-tight text-text-primary transition-colors hover:opacity-80 md:overflow-visible md:whitespace-normal"
            onClick={(e) => e.stopPropagation()}
          >
            @{username}
          </Link>
          {isArchitectOfBuilding ? (
            <span className="mt-1.5 block w-fit bg-text-primary px-2 py-0.5 font-sans text-2xs font-bold uppercase tracking-[0.1em] text-text-inverse">
              Designed this
            </span>
          ) : isVerifiedArchitect ? (
            <span className="mt-1.5 block w-fit border border-text-primary px-2 py-0.5 font-sans text-2xs font-bold uppercase tracking-[0.1em] text-text-primary">
              Architect
            </span>
          ) : null}
          <p className="mt-2 font-mono text-[9px] text-text-secondary">{monthYear}</p>
        </div>
      </div>
      <div className="my-[14px] shrink-0 border-t border-border-default" aria-hidden />
    </>
  );

  const textAndFootnote = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {entry.rating != null && entry.rating > 0 ? (
        <div className="shrink-0 pb-2">
          <PointsBadge points={entry.rating} />
        </div>
      ) : null}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          variant.textTreatment === "none" ? "items-center justify-center" : "",
        )}
      >
        <DetailCardTextTreatmentBlock
          entry={entry}
          textTreatment={variant.textTreatment}
          narrowColumn={!isFullWidthSingle}
          navigate={navigate}
        />
      </div>
      <DetailCardFootnote
        entry={entry}
        onLike={onLike}
        onComment={onComment}
        navigate={navigate}
        className="mt-auto shrink-0 pt-2"
      />
    </div>
  );

  if (isFullWidthSingle) {
    return (
      <article
        data-testid={`detail-card-with-media-${entry.id}`}
        onClick={handleCardClick}
        className={cn(
          "group/card w-full min-w-0 max-w-full cursor-pointer",
          isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
        )}
      >
        <div className="flex w-full min-w-0 flex-col gap-1">
          <div className="relative h-[400px] w-full min-w-0 overflow-hidden bg-surface-muted">
            <DetailFullWidthHeroMedia
              entry={entry}
              failedImages={failedImages}
              onImageFail={markImageFailed}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col px-0 py-6 md:px-0 md:pb-[32px] md:pl-[44px] md:pr-4 md:pt-[32px]">
            {bylineBlock}
            {textAndFootnote}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid={`detail-card-with-media-${entry.id}`}
      onClick={handleCardClick}
      className={cn(
        "group/card w-full min-w-0 max-w-full cursor-pointer",
        isArchitectOfBuilding && "border-l-2 border-l-text-primary pl-4",
      )}
    >
      <div className="flex w-full min-w-0 max-w-full flex-col gap-1 overflow-x-hidden">
        <div
          className="grid w-full min-w-0 grid-cols-1 gap-0 md:grid-cols-2 md:items-stretch"
          style={isMd ? { height: colHeight } : undefined}
        >
          <div className="min-h-0 min-w-0 w-full overflow-hidden">
            <CardImage
              items={mediaItems}
              height={colHeight}
              reviewId={entry.id}
              firstMediaOnly
              className="h-full min-h-0"
            />
          </div>
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden px-0 py-6",
              "md:h-full md:py-[32px] md:pl-[44px]",
            )}
          >
            {bylineBlock}
            {textAndFootnote}
          </div>
        </div>
        {overflowRows.map((row, rowIndex) => (
          <div
            key={`${row.columnCount}-${row.images[0]?.id ?? rowIndex}-${rowIndex}`}
            className={cn(
              "grid w-full min-w-0 max-w-full gap-1",
              row.columnCount === 2 && "grid-cols-2",
              row.columnCount === 3 && "grid-cols-3",
            )}
          >
            {row.images.map((img) => (
              <DetailOverflowImageCell
                key={img.id}
                image={img}
                failedImages={failedImages}
                onFail={markImageFailed}
                className={
                  row.columnCount === 2 && row.images.length === 1 ? "col-span-2" : undefined
                }
              />
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}
