import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Heart, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import type { DisplayImage } from "../hooks/useBuildingInteractions";

/** Client-side chunks for the media grid (infinite scroll). */
const MEDIA_CHUNK_SIZE = 12;

const MEDIA_FILTERS = ["all", "photos", "videos"] as const;
type MediaFilter = (typeof MEDIA_FILTERS)[number];

interface BuildingMediaTabProps {
  /** All display images for the building (sorted/filtered internally). */
  images: DisplayImage[];
  /** Resets the reveal window when the building changes. */
  buildingId?: string;
  onSelectImage: (img: DisplayImage) => void;
  /** Media-tab shortcut: open a fresh note draft and prompt for photos. */
  onUploadPhoto: () => void;
  /** Jump to Overview and open a blank note. */
  onWriteNote: () => void;
  /** Reviews + recent-activity, rendered below the grid inside the error boundary. */
  children?: ReactNode;
  /** True when more review pages remain to fetch from the data layer. */
  hasMore?: boolean;
  /** Fetch and append the next page once the loaded set is scrolled through. */
  onLoadMore?: () => void;
}

/**
 * The Media tab body: filterable masonry gallery with chunked infinite-scroll
 * reveal (so hundreds of `<img>` never mount at once), lazy-loaded images, and
 * an editorial empty state. Extracted from `BuildingDetails.tsx` to keep the
 * page under its file-size cap.
 */
export function BuildingMediaTab({
  images,
  buildingId,
  onSelectImage,
  onUploadPhoto,
  onWriteNote,
  children,
  hasMore = false,
  onLoadMore,
}: BuildingMediaTabProps) {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [visibleCount, setVisibleCount] = useState(MEDIA_CHUNK_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => b.likes_count - a.likes_count),
    [images],
  );

  const filteredImages = useMemo(() => {
    if (mediaFilter === "photos") return sortedImages.filter((img) => img.type !== "video");
    if (mediaFilter === "videos") return sortedImages.filter((img) => img.type === "video");
    return sortedImages;
  }, [sortedImages, mediaFilter]);

  const videoCount = useMemo(
    () => sortedImages.filter((img) => img.type === "video").length,
    [sortedImages],
  );

  // Reset the reveal window when the building, filter, or set size changes.
  useEffect(() => {
    setVisibleCount(MEDIA_CHUNK_SIZE);
  }, [buildingId, mediaFilter, filteredImages.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const len = filteredImages.length;
    const observer = new IntersectionObserver(
      (obs) => {
        if (!obs[0]?.isIntersecting) return;
        // Reveal more of the loaded set; once exhausted, pull the next DB page.
        if (visibleCount < len) {
          setVisibleCount((n) => Math.min(n + MEDIA_CHUNK_SIZE, len));
        } else if (hasMore) {
          onLoadMore?.();
        }
      },
      { root: null, rootMargin: "320px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredImages.length, visibleCount, hasMore, onLoadMore]);

  const visibleImages = useMemo(
    () => filteredImages.slice(0, visibleCount),
    [filteredImages, visibleCount],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold tracking-tight">Media</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="cursor-pointer flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
            onClick={onUploadPhoto}
          >
            <Plus className="h-3 w-3" /> Upload
          </button>
          <button
            type="button"
            onClick={onWriteNote}
            className="cursor-pointer rounded-none bg-text-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Filter strip */}
      <div className="-mb-px flex gap-1 border-b border-border-default">
        {MEDIA_FILTERS.map((f) => {
          const count = f === "all" ? sortedImages.length : f === "videos" ? videoCount : 0;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setMediaFilter(f)}
              className={cn(
                "cursor-pointer border-b-2 px-4 py-2.5 text-xs font-bold uppercase capitalize tracking-widest transition-colors",
                mediaFilter === f
                  ? "border-text-primary text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              )}
            >
              {f}
              {count > 0 && (
                <span className="ml-1.5 font-normal normal-case tracking-normal text-text-disabled">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <WidgetErrorBoundary>
        {filteredImages.length > 0 ? (
          <>
            <div className="columns-2 gap-3 lg:columns-3">
              {visibleImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative mb-3 cursor-pointer overflow-hidden rounded-none break-inside-avoid bg-surface-muted"
                  onClick={() => onSelectImage(img)}
                >
                  {img.type === "video" ? (
                    <div className="relative aspect-video">
                      {img.poster ? (
                        <img
                          src={img.poster}
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
                  ) : (
                    <img
                      src={img.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="block w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  {img.likes_count > 0 && (
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow-sm">
                      <Heart className="h-2.5 w-2.5 fill-white" aria-hidden />
                      {img.likes_count}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {(visibleCount < filteredImages.length || hasMore) && (
              <div ref={sentinelRef} aria-hidden className="h-px w-full" />
            )}
          </>
        ) : (
          <EmptyState
            eyebrow={mediaFilter === "all" ? "No photos yet" : `No ${mediaFilter} yet`}
            message="Be the first to capture this building and share it with the community."
            action={
              <Button size="sm" onClick={onUploadPhoto}>
                Upload photo
              </Button>
            }
          />
        )}

        {children}
      </WidgetErrorBoundary>
    </div>
  );
}
