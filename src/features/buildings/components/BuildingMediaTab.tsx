import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { GalleryVertical, LayoutDashboard, LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { MediaGalleryItem, type MediaGalleryVariant } from "./MediaGalleryItem";
import type { DisplayImage } from "../hooks/useBuildingInteractions";

/** Client-side chunks for the media grid (infinite scroll). */
const MEDIA_CHUNK_SIZE = 12;

const MEDIA_FILTERS = ["all", "photos", "videos"] as const;
type MediaFilter = (typeof MEDIA_FILTERS)[number];

type MediaView = MediaGalleryVariant;

/** Per-view gallery container: how the shared item set is laid out. */
const VIEW_CONTAINER_CLASS: Record<MediaView, string> = {
  masonry: "columns-2 gap-3 lg:columns-3",
  feed: "mx-auto max-w-2xl space-y-8",
  grid: "grid grid-cols-3 gap-mosaic-gap bg-border-default md:grid-cols-4",
};

const VIEW_OPTIONS: { id: MediaView; label: string; Icon: typeof LayoutGrid }[] = [
  { id: "masonry", label: "Masonry view", Icon: LayoutDashboard },
  { id: "feed", label: "Feed view", Icon: GalleryVertical },
  { id: "grid", label: "Grid view", Icon: LayoutGrid },
];

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
 * The Media tab body: filterable gallery with three switchable layouts
 * (masonry / single-column feed / square grid, persisted as `?view=`),
 * chunked infinite-scroll reveal (so hundreds of `<img>` never mount at
 * once), lazy-loaded images, and an editorial empty state. Extracted from
 * `BuildingDetails.tsx` to keep the page under its file-size cap.
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

  // View toggle lives in the URL (03-frontend.mdc URL-first state); the
  // masonry default is omitted, and unknown values fall back to it.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get("view");
  const view: MediaView = rawView === "feed" || rawView === "grid" ? rawView : "masonry";
  const setView = useCallback(
    (v: MediaView) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === "masonry") next.delete("view");
          else next.set("view", v);
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

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
        <h3 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">Media</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="cursor-pointer flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary transition-colors hover:text-text-primary"
            onClick={onUploadPhoto}
          >
            <Plus className="h-3 w-3" /> Upload
          </button>
          <button
            type="button"
            onClick={onWriteNote}
            className="cursor-pointer rounded-none bg-text-primary px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-text-inverse transition-opacity hover:opacity-80"
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Filter strip + view switcher */}
      <div className="flex items-end justify-between border-b border-border-default">
        <div className="-mb-px flex gap-1">
          {MEDIA_FILTERS.map((f) => {
            const count = f === "all" ? sortedImages.length : f === "videos" ? videoCount : 0;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setMediaFilter(f)}
                className={cn(
                  "cursor-pointer border-b-2 px-4 py-2.5 text-[11px] font-medium uppercase capitalize tracking-[0.15em] transition-colors",
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
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as MediaView)}
          className="pb-1.5"
          aria-label="Gallery layout"
        >
          {VIEW_OPTIONS.map(({ id, label, Icon }) => (
            <ToggleGroupItem key={id} value={id} aria-label={label} className="h-8 w-8 p-0">
              <Icon className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <WidgetErrorBoundary>
        {filteredImages.length > 0 ? (
          <>
            <div className={VIEW_CONTAINER_CLASS[view]} data-testid={`media-view-${view}`}>
              {visibleImages.map((img) => (
                <MediaGalleryItem key={img.id} image={img} variant={view} onSelect={onSelectImage} />
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
