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
      navigate(
        getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id),
      );
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
      {/* Thumbnail — sharp edges, no radius */}
      {cardImageSrc && imageVisible && (
        <div
          className={cn(
            "shrink-0 overflow-hidden bg-surface-muted",
            isHero ? "w-28 h-28" : "w-20 h-20",
          )}
        >
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
        {/* Lead line: visited label, or who wants to visit (no separate "Bucket list" chrome) */}
        {activityStatus === "visited" ? (
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-secondary">
            Visited
          </span>
        ) : (
          <span className="font-mono text-[10px] tracking-[0.12em] text-text-secondary">
            <span className="uppercase font-medium text-text-primary">{username}</span>
            <span> wants to visit</span>
          </span>
        )}

        {/*
         * Building name — editorial scale.
         * font-black + leading-none matches the BuildingHeadline treatment in
         * ReviewCardFeed. The hierarchy here is: tiny label → massive title,
         * same A24 poster contrast.
         */}
        <h3
          className={cn(
            "font-black tracking-tight text-text-primary mt-0.5",
            isHero
              ? "text-3xl md:text-4xl leading-none"
              : "text-2xl leading-tight",
          )}
        >
          {mainTitle}
        </h3>

        {/* Location — mono meta, consistent with byline treatment */}
        {city && (
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary mt-1.5">
            {city}
          </p>
        )}

        {/* Byline row — pending cards surface intent in the lead line above */}
        <div className="flex items-center gap-2 min-w-0 mt-2">
          {activityStatus === "visited" && (
            <>
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary font-medium truncate">
                {username}
              </span>
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-text-secondary/50 shrink-0">
                {actionCopy}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary hover:text-text-primary transition-colors ml-auto shrink-0"
          >
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}