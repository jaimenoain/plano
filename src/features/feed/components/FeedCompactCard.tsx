import { useNavigate } from "react-router";
import { useState } from "react";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { getBuildingImageUrl } from "@/utils/image";

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

interface FeedCompactCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onComment?: (reviewId: string) => void;
}

export function FeedCompactCard({
  entry,
  onLike: _onLike,
  onComment: _onComment,
}: FeedCompactCardProps) {
  const navigate = useNavigate();
  const [imageVisible, setImageVisible] = useState(true);
  const [saved, setSaved] = useState(false);

  if (!entry.building) return null;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (entry.building.id) {
      navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
      navigate(`/review/${entry.id}`);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved((s) => !s);
  };

  const username = entry.user?.username || "Unknown User";
  const mainTitle = entry.building.name;
  const actionText = entry.status === "pending" ? "saved" : "visited";

  const cardImageSrc =
    getBuildingImageUrl(entry.building.main_image_url) ??
    getBuildingImageUrl(entry.building.community_preview_url);

  return (
    <div
      onClick={handleCardClick}
      className="flex items-start gap-4 w-full cursor-pointer pb-6 border-b border-border-default"
    >
      {/* Thumbnail */}
      {cardImageSrc && imageVisible && (
        <div className="w-24 h-24 shrink-0 overflow-hidden bg-surface-muted rounded-none">
          <img
            src={cardImageSrc}
            alt={mainTitle}
            className="w-full h-full object-cover"
            onError={() => setImageVisible(false)}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Category label */}
        <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary">
          {actionText}
        </span>

        {/* Building name — editorial scale */}
        <h3 className="text-3xl font-semibold tracking-tight leading-tight text-text-primary mt-1">
          {mainTitle}
        </h3>

        {entry.rating != null && entry.rating > 0 && (
          <div className="mt-2">
            <PointsBadge points={entry.rating} />
          </div>
        )}

        {/* Review excerpt */}
        {entry.content && (
          <p className="text-sm leading-relaxed text-text-secondary mt-2 line-clamp-2">
            {entry.content}
          </p>
        )}

        <div className="flex items-center gap-2 min-w-0 mt-3">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary font-medium truncate">
            {username}
          </span>
          <button
            type="button"
            onClick={handleSave}
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary hover:text-text-primary transition-colors ml-auto shrink-0"
          >
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
