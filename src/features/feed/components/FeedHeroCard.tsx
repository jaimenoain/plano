import { Circle, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { useState } from "react";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { FeedPhotoCarousel } from "./FeedPhotoCarousel";

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
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
}

// ─── Main card ───────────────────────────────────────────────────────────────

export function FeedHeroCard({
  entry,
  index = 0,
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
  const avatarUrl = entry.user?.avatar_url || undefined;
  const userInitial = username.charAt(0).toUpperCase();
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

    if (allImages.length > 1) {
      return (
        <FeedPhotoCarousel
          images={allImages}
          reviewId={entry.id}
          onImageLike={onImageLike}
          className="w-full h-full"
        />
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

    return null;
  };

  const hasImages = allImages.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <article
      onClick={handleCardClick}
      className="group relative w-full cursor-pointer"
    >
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
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-text-primary mb-3">
            {mainTitle}
          </h2>

          {/* Architect + location */}
          {(primaryCreditLine || city) && (
            <p className="text-sm text-text-secondary mb-4">
              {primaryCreditLine}{primaryCreditLine && city ? " · " : ""}{city}
            </p>
          )}

          {/* Rating */}
          {entry.rating && entry.rating > 0 && (
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Circle
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5",
                    i < entry.rating!
                      ? "fill-text-primary text-text-primary"
                      : "fill-transparent text-text-disabled"
                  )}
                />
              ))}
            </div>
          )}

          {/* Review excerpt */}
          {entry.content && (
            <p className="text-base leading-relaxed text-text-secondary max-w-md mb-6 line-clamp-4">
              {entry.content}
            </p>
          )}

          {/* User attribution + bookmark */}
          <div className="flex items-center gap-2.5">
            <Avatar className="h-6 w-6">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-text-primary">{username}</span>

            <div className="flex-1" />

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              disabled={isSaving}
              title={isSaved ? "Saved" : "Save"}
            >
              <Bookmark className={cn("h-5 w-5", isSaved ? "fill-text-primary text-text-primary" : "")} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
