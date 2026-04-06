import { Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router";
import { useState } from "react";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { cn } from "@/lib/utils";

interface FeedActivityCardProps {
  entry: FeedReview;
  activityStatus: "visited" | "pending";
  onLike?: (reviewId: string) => void;
  size?: "hero" | "compact";
}

export function FeedActivityCard({
  entry,
  activityStatus,
  onLike: _onLike,
  size = "hero",
}: FeedActivityCardProps) {
  const navigate = useNavigate();
  const [imageVisible, setImageVisible] = useState(true);
  const [saved, setSaved] = useState(false);

  if (!entry.building) return null;

  const isHero = size === "hero";
  const username = entry.user?.username ?? "Unknown User";
  const avatarUrl = entry.user?.avatar_url ?? undefined;
  const userInitial = username.charAt(0).toUpperCase();
  const mainTitle = entry.building.name;
  const city =
    entry.building.city ||
    entry.building.address?.split(",").pop()?.trim() ||
    "";

  const cardImageSrc =
    getBuildingImageUrl(entry.building.main_image_url) ??
    getBuildingImageUrl(entry.building.community_preview_url);

  const actionCopy =
    activityStatus === "visited" ? "visited" : "wants to visit";

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

  return (
    <article
      onClick={handleCardClick}
      className="flex items-start gap-4 w-full cursor-pointer pb-6 border-b border-border-default"
    >
      {/* Thumbnail — larger sizes */}
      {cardImageSrc && imageVisible && (
        <div className={cn(
          "shrink-0 overflow-hidden bg-surface-muted rounded-none",
          isHero ? "w-28 h-28" : "w-24 h-24"
        )}>
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
          {activityStatus === "visited" ? "Visited" : "Bucket list"}
        </span>

        {/* Building name */}
        <h3 className={cn(
          "font-semibold text-text-primary leading-tight mt-1",
          isHero ? "text-xl" : "text-base"
        )}>
          {mainTitle}
        </h3>

        {/* Location */}
        {city && (
          <p className="text-xs text-text-secondary mt-1">{city}</p>
        )}

        {/* Attribution + bookmark */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <Avatar className={cn("shrink-0", isHero ? "h-5 w-5" : "h-4 w-4")}>
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-[8px]">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-text-secondary">
              <span className="font-medium text-text-primary">{username}</span>
              {" "}{actionCopy}
            </span>
          </div>

          <div className="flex-1" />

          {/* Bookmark */}
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
    </article>
  );
}
