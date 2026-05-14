import { Link } from "react-router";
import { getBuildingUrl } from "@/utils/url";
import { CardAttribution } from "./card-parts/CardAttribution";
import { VelocityBadge } from "./VelocityBadge";
import type { FeedItemBuildingSpotlight } from "@/types/feedItem";

interface BuildingSpotlightCardProps {
  item: FeedItemBuildingSpotlight;
}

function activityHeadline(
  window: "24h" | "7d" | "30d",
  postsCount: number,
  photosCount: number,
): string {
  const timeLabel =
    window === "24h" ? "today" : window === "7d" ? "this week" : "this month";
  if (photosCount > 0) {
    return `${photosCount} new photo${photosCount === 1 ? "" : "s"} ${timeLabel}`;
  }
  return `${postsCount} new post${postsCount === 1 ? "" : "s"} ${timeLabel}`;
}

export function BuildingSpotlightCard({ item }: BuildingSpotlightCardProps) {
  const { payload, attribution } = item;
  const heroImage = payload.communityPreviewUrl ?? payload.mainImageUrl;
  const buildingUrl = getBuildingUrl(
    payload.buildingId,
    payload.slug,
    payload.shortId ?? undefined,
  );

  return (
    <Link
      to={buildingUrl}
      className="flex flex-col h-full bg-surface-default border border-border-default overflow-hidden group"
    >
      {/* Hero image */}
      {heroImage ? (
        <div className="flex-shrink-0 h-[58%] overflow-hidden relative">
          <img
            src={heroImage}
            alt={payload.buildingName}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
          {payload.photosCount >= 10 && (
            <div className="absolute bottom-3 left-3">
              <VelocityBadge recentLikes={payload.photosCount} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-shrink-0 h-[58%] bg-surface-overlay" />
      )}

      {/* Body */}
      <div className="flex flex-col flex-1 justify-between p-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <CardAttribution kind={attribution.kind} text={attribution.text} />
          <h3 className="font-semibold text-sm text-text-primary leading-snug line-clamp-2">
            {payload.buildingName}
          </h3>
          <p className="text-xs text-text-secondary">
            {activityHeadline(payload.window, payload.postsCount, payload.photosCount)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          {/* Facepile of ring-1 contributors */}
          {payload.ring1Contributors.length > 0 && (
            <div className="flex -space-x-1.5" aria-label="People you follow who contributed">
              {payload.ring1Contributors.slice(0, 4).map((contributor) => (
                <div
                  key={contributor.id}
                  className="w-6 h-6 rounded-full bg-surface-overlay border-2 border-surface-default overflow-hidden"
                  title={contributor.username}
                >
                  {contributor.avatarUrl ? (
                    <img
                      src={contributor.avatarUrl}
                      alt={contributor.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-overlay flex items-center justify-center">
                      <span className="text-[8px] font-medium text-text-secondary uppercase">
                        {contributor.username[0]}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <span className="ml-auto text-[11px] font-medium tracking-[0.15em] uppercase text-text-secondary group-hover:text-text-primary transition-colors">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}
