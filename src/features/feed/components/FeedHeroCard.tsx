import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import type { CardSpec, CardTextWeight } from "@/types/cards";
import { getBuildingUrl } from "@/utils/url";
import { useEffect, useMemo, useState } from "react";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { FeedPhotoCarousel } from "./FeedPhotoCarousel";
import { resolveCardSpec } from "@/features/feed/utils/resolveCardSpec";

/**
 * Award points badge. Renders filled black dots only — no empty placeholders.
 * Shows nothing when points === 0. Points are an award (like Michelin stars),
 * not a score, so absence is neutral and must not be visualised.
 * Uses bg-text-primary (monochromatic) — brand-primary is forbidden on content pages.
 */
const PointsBadge = ({ points }: { points: number }) => {
  if (!points || points <= 0) return null;
  return (
    <div
      className="flex items-center gap-1.5"
      title={`${points} ${points === 1 ? "point" : "points"}`}
    >
      {Array.from({ length: points }).map((_, i) => (
        <div key={i} className="w-3 h-3 rounded-full bg-text-primary" />
      ))}
    </div>
  );
};

function heroBodyClampClass(textWeight: CardTextWeight, essayExpanded: boolean): string {
  switch (textWeight) {
    case "none":
      return "";
    case "snippet":
      return "line-clamp-card-snippet";
    case "body":
      return "line-clamp-card-body";
    case "essay":
      return essayExpanded ? "" : "line-clamp-card-body";
    default:
      return "";
  }
}

// ─── Single-image subcomponent ───────────────────────────────────────────────

interface FeedHeroSingleImageProps {
  image: { id: string; url: string };
  onError: (id: string) => void;
}

function FeedHeroSingleImage({ image, onError }: FeedHeroSingleImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full min-h-[300px] md:min-h-0 bg-surface-muted">
      {!loaded && <div className="absolute inset-0 bg-surface-muted animate-pulse" />}
      <img
        src={image.url}
        onLoad={() => setLoaded(true)}
        onError={() => onError(image.id)}
        className={cn(
          "w-full h-full object-cover rounded-none transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        alt="Building"
      />
    </div>
  );
}

// ─── Card props ──────────────────────────────────────────────────────────────

interface FeedHeroCardProps {
  entry: FeedReview;
  index?: number;
  /** When omitted, derived via {@link resolveCardSpec}(entry). */
  spec?: CardSpec;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
}

// ─── Main card ───────────────────────────────────────────────────────────────

export function FeedHeroCard({
  entry,
  index = 0,
  spec: specProp,
  onLike: _onLike,
  onImageLike,
  onComment: _onComment,
}: FeedHeroCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [essayExpanded, setEssayExpanded] = useState(false);
  const effectiveSpec = useMemo(() => specProp ?? resolveCardSpec(entry), [entry, specProp]);

  useEffect(() => {
    setEssayExpanded(false);
  }, [entry.id]);

  if (!entry.building) return null;

  const viewerStatus = entry.building ? statuses[entry.building.id] : undefined;
  const isSaved = viewerStatus === "pending";
  const isReversed = index % 2 !== 0;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        { user_id: user.id, building_id: entry.building.id, status: "pending", edited_at: new Date().toISOString() },
        { onConflict: "user_id, building_id" }
      );
      if (error) throw error;
      toast({ title: "Saved to your list" });
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building.id) {
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  const username = entry.user?.username || "Unknown User";
  const mainTitle = entry.building.name;
  const credits = entry.building.creditedEntities;
  const primaryCreditLine =
    credits && credits.length > 0 ? credits.map((c) => c.name).join(", ") : null;
  const city = entry.building.city || entry.building.address?.split(",").pop()?.trim() || "";

  const handleImageError = (imageId: string) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  // ── Image rendering ─────────────────────────────────────────────────────────
  const allImages = entry.images || [];
  const singleImages = allImages.filter((img) => !failedImages.has(img.id));

  const renderImages = () => {
    if (allImages.length === 0) return null;

    if (allImages.length > 2 || effectiveSpec.imageWeight === "gallery") {
      return (
        <FeedPhotoCarousel
          images={allImages}
          reviewId={entry.id}
          onImageLike={onImageLike}
          className="w-full h-full"
        />
      );
    }

    if (
      effectiveSpec.imageWeight === "pair" &&
      singleImages.length >= 2
    ) {
      return (
        <div className="grid grid-cols-2 gap-[2px] w-full h-full min-h-[280px] md:min-h-[400px]">
          <div className="relative h-full min-h-[280px] min-w-0 overflow-hidden bg-surface-muted md:min-h-0">
            <FeedHeroSingleImage
              image={singleImages[0]}
              onError={handleImageError}
            />
          </div>
          <div className="relative h-full min-h-[280px] min-w-0 overflow-hidden bg-surface-muted md:min-h-0">
            <FeedHeroSingleImage
              image={singleImages[1]}
              onError={handleImageError}
            />
          </div>
        </div>
      );
    }

    if (singleImages.length === 1) {
      return (
        <FeedHeroSingleImage
          image={singleImages[0]}
          onError={handleImageError}
        />
      );
    }

    return (
      <FeedPhotoCarousel
        images={allImages}
        reviewId={entry.id}
        onImageLike={onImageLike}
        className="w-full h-full"
      />
    );
  };

  const hasImages = allImages.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  const bodyClamp = heroBodyClampClass(effectiveSpec.textWeight, essayExpanded);
  const showReadMore =
    effectiveSpec.textWeight === "essay" && !essayExpanded && Boolean(entry.content?.trim());

  return (
    <article onClick={handleCardClick} className="group relative w-full cursor-pointer">
      {/* Magazine spread: two-column on desktop, stacked on mobile */}
      <div className={cn(
        "grid grid-cols-1 gap-0 items-stretch",
        hasImages && "md:grid-cols-2"
      )}>
        {/* Image column */}
        {hasImages && (
          <div className={cn(
            "relative overflow-hidden min-h-[280px] md:min-h-[400px]",
            isReversed ? "md:order-2" : "md:order-1"
          )}>
            {renderImages()}
          </div>
        )}

        {/* Text column */}
        <div className={cn(
          "flex flex-col justify-center py-6 md:py-10",
          hasImages && (isReversed ? "md:order-1 md:pr-10" : "md:order-2 md:pl-10"),
          !hasImages && "max-w-xl"
        )}>
          {/* Category label */}
          <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary mb-3">
            {entry.status === "visited" ? "Review" : "Building"}
          </span>

          {/* Building name — editorial scale */}
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-text-primary mb-3">
            {mainTitle}
          </h2>

          {/* Architect + location */}
          {(primaryCreditLine || city) && (
            <p className="text-sm text-text-secondary mb-4">
              {primaryCreditLine}{primaryCreditLine && city ? " · " : ""}{city}
            </p>
          )}

          {entry.rating != null && entry.rating > 0 && (
            <div className="mb-3">
              <PointsBadge points={entry.rating} />
            </div>
          )}

          {/* Review excerpt */}
          {entry.content && (
            <div className="max-w-md mb-6">
              <p
                className={cn(
                  "text-base leading-relaxed text-text-secondary",
                  bodyClamp,
                )}
              >
                {entry.content}
              </p>
              {showReadMore && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEssayExpanded(true);
                  }}
                  className="mt-1.5 font-mono text-[10px] tracking-[0.15em] uppercase text-text-primary hover:text-text-secondary transition-colors"
                >
                  Read more →
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary font-medium truncate">
              {username}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary hover:text-text-primary transition-colors ml-auto shrink-0 ${isSaving ? "opacity-50" : ""}`}
            >
              {isSaved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
