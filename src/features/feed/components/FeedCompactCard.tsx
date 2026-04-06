import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router";
import { useState } from "react";
import { FeedReview } from "@/types/feed";
import { getBuildingUrl } from "@/utils/url";
import { getBuildingImageUrl } from "@/utils/image";
import { Bookmark, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const avatarUrl = entry.user?.avatar_url || undefined;
  const userInitial = username.charAt(0).toUpperCase();
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
        <h3 className="text-2xl font-semibold tracking-tight leading-tight text-text-primary mt-1">
          {mainTitle}
        </h3>

        {/* Rating */}
        {entry.rating && entry.rating > 0 && (
          <div className="flex items-center gap-0.5 mt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Circle
                key={i}
                className={cn(
                  "w-3 h-3",
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
          <p className="text-sm leading-relaxed text-text-secondary mt-2 line-clamp-2">
            {entry.content}
          </p>
        )}

        {/* Attribution + bookmark */}
        <div className="flex items-center gap-2 mt-3">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-[8px]">{userInitial}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-text-primary">{username}</span>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleSave}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title={saved ? "Saved" : "Save"}
          >
            <Bookmark
              className={cn("h-4 w-4", saved ? "fill-text-primary text-text-primary" : "")}
              strokeWidth={1.8}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
