import { Link } from "react-router";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamAuthorAttribution } from "./StreamAuthorAttribution";
import type { DisplayImage } from "../hooks/buildingCommunityData";
import type { StreamBlock } from "../utils/streamBlocks";

/**
 * Renders one block of the building editorial stream in its assigned layout
 * (featured / mosaic / image-review / image-only / text-only). Extracted from
 * the BuildingDetails page; used by the Overview tab and the Media tab's
 * text-review list.
 */
export function StreamBlockView({
  block,
  onSelectImage,
}: {
  block: StreamBlock;
  onSelectImage: (img: DisplayImage) => void;
}) {
  const { images, content, user, rating, isOfficial, topLikes, blockType } = block;
  const preview = content && content.length > 220 ? content.slice(0, 220) + "…" : content;
  const authorAttribution =
    user?.username?.trim() ? (
      <StreamAuthorAttribution user={user} rating={rating} />
    ) : null;

  if (blockType === "featured") {
    const img = images[0];
    if (!img) return null;
    return (
      <div className="space-y-4 border-b border-border-default pb-10">
        <div
          className="group relative aspect-16/10 cursor-pointer overflow-hidden bg-surface-muted"
          onClick={() => onSelectImage(img)}
        >
          <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300" />
          {isOfficial && (
            <span className="absolute left-4 top-4 bg-text-primary px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-text-inverse rounded-none">
              Official
            </span>
          )}
          {img.likes_count > 0 && (
            <span className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[11px] font-bold text-white drop-shadow-md">
              <Heart className="h-3.5 w-3.5 fill-white text-white" aria-hidden />
              {img.likes_count}
            </span>
          )}
        </div>
        {(preview || authorAttribution) && (
          <div className="pt-4 space-y-3">
            {authorAttribution}
            {preview && (
              <Link to={`/review/${block.entryId}`} className="group/r block">
                <p className="text-sm leading-relaxed text-text-secondary italic group-hover/r:text-text-primary">
                  &ldquo;{preview}&rdquo;
                </p>
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  if (blockType === "mosaic") {
    return (
      <div className="space-y-4 border-b border-border-default pb-10">
        <div className={cn("grid gap-px bg-border-default", images.length >= 4 ? "grid-cols-2" : "grid-cols-2")}>
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
              {img.likes_count > 0 && (
                <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-sm">
                  <Heart className="h-2.5 w-2.5 fill-white" aria-hidden />
                  {img.likes_count}
                </span>
              )}
            </div>
          ))}
        </div>
        {(preview || authorAttribution) && (
          <div className="pt-4 space-y-3">
            {authorAttribution}
            {preview && (
              <Link to={`/review/${block.entryId}`} className="group/r block">
                <p className="text-sm leading-relaxed text-text-secondary italic group-hover/r:text-text-primary">
                  &ldquo;{preview}&rdquo;
                </p>
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  if (blockType === "image-review") {
    const img = images[0];
    if (!img) return null;
    return (
      <div className="space-y-4 border-b border-border-default pb-10">
        <div
          className="group relative aspect-4/3 cursor-pointer overflow-hidden bg-surface-muted"
          onClick={() => onSelectImage(img)}
        >
          <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {img.likes_count > 0 && (
            <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-white drop-shadow-sm">
              <Heart className="h-3 w-3 fill-white" aria-hidden />
              {img.likes_count}
            </span>
          )}
        </div>
        <div className="pt-4 space-y-3">
          {authorAttribution}
          {preview && (
            <Link to={`/review/${block.entryId}`} className="group/r block">
              <p className="text-sm leading-relaxed text-text-secondary italic group-hover/r:text-text-primary">
                &ldquo;{preview}&rdquo;
              </p>
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (blockType === "image-only") {
    const img = images[0];
    if (!img) return null;
    const isTall = topLikes >= 10;
    return (
      <div className="group space-y-4 border-b border-border-default pb-10">
        <div
          className={cn(
            "relative cursor-pointer overflow-hidden bg-surface-muted",
            isTall ? "aspect-4/5" : "aspect-4/3",
          )}
          onClick={() => onSelectImage(img)}
        >
          <img src={img.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300" />
          {img.likes_count > 0 && (
            <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-white">
              <Heart className="h-3 w-3 fill-white" aria-hidden />
              {img.likes_count}
            </span>
          )}
        </div>
        {authorAttribution && <div className="pt-4">{authorAttribution}</div>}
      </div>
    );
  }

  if (blockType === "text-only") {
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

  return null;
}
