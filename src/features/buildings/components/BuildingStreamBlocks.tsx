import { Link } from "react-router";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamAuthorAttribution } from "./StreamAuthorAttribution";
import type { DisplayImage } from "../hooks/buildingCommunityData";
import type { StreamBlock } from "../utils/streamBlocks";

type StreamVariant = "overview" | "media";

/** Editorial review body — mock `.review-body`: 17px/1.75, no quote marks. */
function ReviewBody({ entryId, text }: { entryId: string; text: string }) {
  return (
    <Link to={`/review/${entryId}`} className="block">
      <p className="text-[17px] leading-[1.75] text-text-primary transition-colors hover:text-text-secondary">
        {text}
      </p>
    </Link>
  );
}

/**
 * Author column + body — mock `.review` row (240px who-column on md+).
 */
function ReviewRow({
  attribution,
  entryId,
  text,
}: {
  attribution: React.ReactNode;
  entryId: string;
  text: string;
}) {
  return (
    <div className="space-y-4 md:grid md:grid-cols-[240px_1fr] md:gap-14 md:space-y-0">
      <div>{attribution}</div>
      <ReviewBody entryId={entryId} text={text} />
    </div>
  );
}

/**
 * Caption-credit line below an image — mock `.feature-credit`: caption and
 * attribution on the left, likes count on the right. Replaces the old
 * absolute ♥ overlays.
 */
function CaptionCreditLine({
  caption,
  likes,
  children,
}: {
  caption?: string | null;
  likes: number;
  children?: React.ReactNode;
}) {
  if (!caption && !children && likes <= 0) return null;
  return (
    <div className="pt-3 space-y-3">
      {caption && (
        <p className="text-[13px] leading-snug text-text-primary">{caption}</p>
      )}
      {(children || likes > 0) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">{children}</div>
          {likes > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 pt-1 text-[11px] text-text-secondary">
              <Heart className="h-3 w-3" aria-hidden />
              {likes}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Renders one block of the building editorial stream in its assigned layout
 * (featured / mosaic / image-review / image-only / text-only). The default
 * `overview` variant is the editorial treatment (large type, caption-credit
 * lines, author-column review rows); `media` keeps the compact quote list
 * used under the Media tab's photo grid.
 */
export function StreamBlockView({
  block,
  onSelectImage,
  variant = "overview",
}: {
  block: StreamBlock;
  onSelectImage: (img: DisplayImage) => void;
  variant?: StreamVariant;
}) {
  const { images, content, user, rating, isOfficial, topLikes, blockType } = block;
  const preview = content && content.length > 220 ? content.slice(0, 220) + "…" : content;
  const authorAttribution =
    user?.username?.trim() ? (
      <StreamAuthorAttribution user={user} rating={rating} />
    ) : null;

  if (variant === "media") {
    if (!preview) return null;
    return (
      <div className="space-y-3 border-b border-border-default pb-10">
        {authorAttribution}
        <Link to={`/review/${block.entryId}`} className="group/r block">
          <p className="text-sm leading-relaxed text-text-secondary italic group-hover/r:text-text-primary">
            &ldquo;{preview}&rdquo;
          </p>
        </Link>
      </div>
    );
  }

  if (blockType === "featured") {
    const img = images[0];
    if (!img) return null;
    return (
      <div className="border-b border-border-default pb-10">
        <div
          className="group relative aspect-16/10 cursor-pointer overflow-hidden bg-surface-muted"
          onClick={() => onSelectImage(img)}
        >
          <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          {isOfficial && (
            <span className="absolute left-4 top-4 bg-surface-card/90 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-text-primary rounded-none">
              Official
            </span>
          )}
        </div>
        <CaptionCreditLine caption={img.caption} likes={img.likes_count}>
          {preview ? null : authorAttribution}
        </CaptionCreditLine>
        {preview && (
          <div className="pt-6">
            <ReviewRow attribution={authorAttribution} entryId={block.entryId} text={preview} />
          </div>
        )}
      </div>
    );
  }

  if (blockType === "mosaic") {
    return (
      <div className="border-b border-border-default pb-10">
        <div className="grid grid-cols-2 gap-px bg-border-default">
          {images.slice(0, 4).map((img, i) => (
            <div
              key={img.id}
              className={cn(
                "group relative cursor-pointer overflow-hidden bg-surface-muted",
                images.length === 3 && i === 0 ? "col-span-2 aspect-2/1" : "aspect-square",
              )}
              onClick={() => onSelectImage(img)}
            >
              <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          ))}
        </div>
        <CaptionCreditLine likes={topLikes}>
          {preview ? null : authorAttribution}
        </CaptionCreditLine>
        {preview && (
          <div className="pt-6">
            <ReviewRow attribution={authorAttribution} entryId={block.entryId} text={preview} />
          </div>
        )}
      </div>
    );
  }

  if (blockType === "image-review") {
    const img = images[0];
    if (!img) return null;
    return (
      <div className="border-b border-border-default pb-10">
        <div
          className="group relative aspect-4/3 cursor-pointer overflow-hidden bg-surface-muted"
          onClick={() => onSelectImage(img)}
        >
          <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
        <CaptionCreditLine caption={img.caption} likes={img.likes_count} />
        {preview && (
          <div className="pt-6">
            <ReviewRow attribution={authorAttribution} entryId={block.entryId} text={preview} />
          </div>
        )}
      </div>
    );
  }

  if (blockType === "image-only") {
    const img = images[0];
    if (!img) return null;
    const isTall = topLikes >= 10;
    return (
      <div className="group border-b border-border-default pb-10">
        <div
          className={cn(
            "relative cursor-pointer overflow-hidden bg-surface-muted",
            isTall ? "aspect-4/5" : "aspect-4/3",
          )}
          onClick={() => onSelectImage(img)}
        >
          <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
        <CaptionCreditLine caption={img.caption} likes={img.likes_count}>
          {authorAttribution}
        </CaptionCreditLine>
      </div>
    );
  }

  if (blockType === "text-only") {
    if (!preview) return null;
    return (
      <div className="border-b border-border-default pb-10">
        <ReviewRow attribution={authorAttribution} entryId={block.entryId} text={preview} />
      </div>
    );
  }

  return null;
}
