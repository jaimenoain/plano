import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DisplayImage } from "../hooks/useBuildingInteractions";

/**
 * Design Pre-flight (03-frontend.mdc):
 * 1. Content width — item fills the column its parent view assigns (masonry
 *    column / feed max-w-2xl / grid cell); no width decisions made here.
 * 2. Action density — the whole tile is the single action (open lightbox);
 *    no per-row buttons.
 * 3. Destructive actions — none.
 * 4. Input width — no inputs.
 * 5. Status signals — likes count is a photo-overlay figure (masonry/grid)
 *    or an inline byline figure (feed), per the existing media-tab grammar.
 */

export type MediaGalleryVariant = "masonry" | "feed" | "grid";

interface MediaGalleryItemProps {
  image: DisplayImage;
  variant: MediaGalleryVariant;
  onSelect: (img: DisplayImage) => void;
}

/** Likes figure overlaid on the photo (masonry + grid views). */
function LikesOverlay({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-sm">
      <Heart className="h-2.5 w-2.5 fill-white" aria-hidden />
      {count}
    </span>
  );
}

/** Video poster + play glyph. Ratio is square in the grid view, 16:9 elsewhere. */
function VideoPoster({ image, square }: { image: DisplayImage; square: boolean }) {
  return (
    <div className={cn("relative", square ? "aspect-square" : "aspect-video")}>
      {image.poster ? (
        <img
          src={image.poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="photo-placeholder absolute inset-0" data-label="Video" aria-hidden />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center bg-black/60">
          <span className="ml-1 border-y-8 border-l-14 border-y-transparent border-l-white" />
        </span>
      </div>
    </div>
  );
}

/**
 * One media-tab gallery tile, rendered in one of three view variants:
 * `masonry` (natural ratio, likes overlaid), `grid` (square crop, likes
 * overlaid), `feed` (natural full width with an editorial byline + caption
 * below). Extracted from `BuildingMediaTab.tsx` so the tab stays under its
 * file-size cap.
 */
export function MediaGalleryItem({ image, variant, onSelect }: MediaGalleryItemProps) {
  const isVideo = image.type === "video";

  if (variant === "feed") {
    const username = image.user?.username;
    return (
      <figure>
        <div
          className="group relative cursor-pointer overflow-hidden rounded-none bg-surface-muted"
          onClick={() => onSelect(image)}
        >
          {isVideo ? (
            <VideoPoster image={image} square={false} />
          ) : (
            <img
              src={image.url}
              alt={image.caption ?? ""}
              loading="lazy"
              decoding="async"
              className="block w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
        </div>
        {(username || image.likes_count > 0 || image.caption) && (
          <figcaption className="mt-2 space-y-1">
            {(username || image.likes_count > 0) && (
              <div className="flex items-baseline justify-between gap-3">
                {username ? (
                  <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
                    {username}
                  </span>
                ) : (
                  <span />
                )}
                {image.likes_count > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-text-secondary">
                    <Heart className="h-2.5 w-2.5" aria-hidden />
                    {image.likes_count}
                  </span>
                )}
              </div>
            )}
            {image.caption && <p className="text-sm text-text-secondary">{image.caption}</p>}
          </figcaption>
        )}
      </figure>
    );
  }

  const isGrid = variant === "grid";
  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-none bg-surface-muted",
        isGrid ? "aspect-square" : "mb-3 break-inside-avoid",
      )}
      onClick={() => onSelect(image)}
    >
      {isVideo ? (
        <VideoPoster image={image} square={isGrid} />
      ) : (
        <img
          src={image.url}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "block w-full object-cover transition-transform duration-500 group-hover:scale-105",
            isGrid && "h-full",
          )}
        />
      )}
      <LikesOverlay count={image.likes_count} />
    </div>
  );
}
