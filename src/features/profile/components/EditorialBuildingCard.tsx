import { Link } from "react-router";
import { FeedReview } from "@/types/feed";
import { RatingDots } from "@/components/ui/rating-dots";
import { getBuildingUrl } from "@/utils/url";
import { profileLogCardImageUrl } from "../utils/profileLogCardImageUrl";

/**
 * No card chrome. 4:3 sharp-edged image, bold name, faint meta below.
 */
export function EditorialBuildingCard({
  entry,
  showCommunityImages,
}: {
  entry: FeedReview;
  showCommunityImages: boolean;
}) {
  const imageUrl = profileLogCardImageUrl(entry, showCommunityImages);
  const topCredit = entry.building.creditedEntities?.[0];
  const meta = [topCredit?.name, entry.building.year_completed].filter(Boolean).join(" · ");
  // Locality URL not available: ReviewBuilding (FeedReview) does not include locality_country_code/city_slug — requires get_feed RPC to include locality fields in building_data
  const url = getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id);

  return (
    <Link to={url} className="group block" data-testid={`review-card-${entry.id}`}>
      <div className="mb-3 aspect-4/3 overflow-hidden rounded-none bg-surface-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={entry.building.name}
            className="size-full object-cover transition-opacity duration-300 group-hover:opacity-85 [@media(hover:none)]:opacity-100"
          />
        ) : (
          <div className="photo-placeholder size-full" data-label={entry.building.name} />
        )}
      </div>
      <p className="text-xl font-bold leading-tight tracking-tight text-text-primary line-clamp-2 transition-opacity group-hover:opacity-60 [@media(hover:none)]:opacity-100">
        {entry.building.name}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-text-disabled">
        {meta && <span className="truncate">{meta}</span>}
        <RatingDots rating={entry.rating} size="sm" />
      </div>
    </Link>
  );
}
