import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CarouselImage {
  id: string;
  url: string;
  likes_count: number;
  is_liked: boolean;
}

interface FeedPhotoCarouselProps {
  /** All images for this review entry — carousel handles load errors internally. */
  images: CarouselImage[];
  /** The parent review ID, forwarded to onImageLike so the hook can target the right entry. */
  reviewId: string;
  /** Optimistic-update handler from useFeed / useSuggestedFeed. */
  onImageLike?: (reviewId: string, imageId: string) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Full-bleed photo carousel for feed entries with multiple uploaded images.
 *
 * Design decisions (aligned with DESIGN_TOKENS.md):
 * - aspect-4/5 — matches FeedHeroSingleImage so the card height is consistent
 * - Counter uses tabular-nums for stable digit width
 * - Active dot extends to a white pill; inactive dots are semi-transparent white —
 *   both sit on photography so white is the only readable colour; no brand-primary
 *   on content pages per monochromatic content-surface rule
 * - Nav chevrons appear on hover only — photo is hero at rest
 * - Per-image like button top-left; liked state uses white fill (not red) to stay
 *   monochromatic within the photo overlay context
 */
export function FeedPhotoCarousel({
  images,
  reviewId,
  onImageLike,
  className,
}: FeedPhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  // Filter out images that failed to load
  const validImages = images.filter((img) => !failedIds.has(img.id));
  const total = validImages.length;

  // Clamp index if images were removed due to errors
  const safeIndex = Math.min(index, Math.max(0, total - 1));
  const current = validImages[safeIndex];

  const handleError = useCallback((id: string) => {
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIndex((i) => (i - 1 + total) % total);
    },
    [total]
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIndex((i) => (i + 1) % total);
    },
    [total]
  );

  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (current) onImageLike?.(reviewId, current.id);
    },
    [current, onImageLike, reviewId]
  );

  if (!current || total === 0) return null;

  return (
    <div
      className={cn("relative w-full select-none overflow-hidden", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Photo ── */}
      <div
        className={cn(
          "relative w-full bg-surface-muted",
          className?.includes("h-full") ? "h-full" : "aspect-4/5",
        )}
      >
        <img
          key={current.id}
          src={current.url}
          alt="Building"
          onError={() => handleError(current.id)}
          className="h-full w-full origin-center object-cover transition-transform duration-500 ease-out hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* ── Counter — top right, Space Mono ── */}
      {total > 1 && (
        <div
          className="absolute top-3 right-3 pointer-events-none"
          aria-label={`Photo ${safeIndex + 1} of ${total}`}
        >
          <span className="font-sans text-[11px] leading-none text-white bg-black/55 px-2.5 py-1 rounded-sm tabular-nums">
            {safeIndex + 1} / {total}
          </span>
        </div>
      )}

      {/* ── Per-image like — top left ── */}
      {/*
        Liked state uses fill-white rather than fill-feedback-destructive:
        the button sits on a dark photo overlay so white fill is readable,
        and content pages are strictly monochromatic — no red on photography.
      */}
      <button
        type="button"
        onClick={handleLike}
        className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 text-white px-2.5 py-1 rounded-sm text-xs font-medium transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-1"
        title={current.is_liked ? "Unlike photo" : "Like photo"}
      >
        <Heart
          className={cn(
            "w-3.5 h-3.5 transition-colors",
            current.is_liked ? "fill-white text-white" : "text-white"
          )}
        />
        {current.likes_count > 0 && (
          <span className="tabular-nums">{current.likes_count}</span>
        )}
      </button>

      {/* ── Prev button ── */}
      {total > 1 && (
        <button
          type="button"
          onClick={prev}
          aria-label="Previous photo"
          className={cn(
            "absolute left-0 top-0 bottom-0 w-14 flex items-center justify-start pl-2 bg-transparent border-none transition-opacity duration-150",
            hovered ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="w-8 h-8 rounded-sm bg-black/52 flex items-center justify-center text-white">
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </span>
        </button>
      )}

      {/* ── Next button ── */}
      {total > 1 && (
        <button
          type="button"
          onClick={next}
          aria-label="Next photo"
          className={cn(
            "absolute right-0 top-0 bottom-0 w-14 flex items-center justify-end pr-2 bg-transparent border-none transition-opacity duration-150",
            hovered ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="w-8 h-8 rounded-sm bg-black/52 flex items-center justify-center text-white">
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </span>
        </button>
      )}

      {/* ── Dot strip — bottom centre ── */}
      {/*
        Active dot: fully opaque white pill.
        Inactive dots: semi-transparent white circles.
        Both sit on photography — white is the only readable choice here,
        and brand-primary (#BEFF00) must not appear on content pages.
      */}
      {total > 1 && (
        <div
          className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 pointer-events-none"
          role="tablist"
          aria-label="Photo indicators"
        >
          {validImages.map((_, i) => (
            <div
              key={i}
              role="tab"
              aria-selected={i === safeIndex}
              className="rounded-full transition-all duration-200 ease-out"
              style={{
                height: 5,
                width: i === safeIndex ? 20 : 5,
                background:
                  i === safeIndex
                    ? "rgba(255,255,255,1)"
                    : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}