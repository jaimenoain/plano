import { Link } from "react-router";
import { getBuildingUrl } from "@/utils/url";
import { CardAttribution } from "./card-parts/CardAttribution";
import { VelocityBadge } from "./VelocityBadge";
import type { FeedItemEditorial } from "@/types/feedItem";

interface EditorialCardProps {
  item: FeedItemEditorial;
}

function HeroImage({
  src,
  alt,
  label,
}: {
  src: string | null | undefined;
  alt: string;
  label?: React.ReactNode;
}) {
  return (
    <div className="flex-shrink-0 h-[62%] overflow-hidden relative">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="eager"
        />
      ) : (
        <div className="w-full h-full bg-surface-overlay" />
      )}
      {label && (
        <div className="absolute bottom-3 left-3">{label}</div>
      )}
    </div>
  );
}

function YearsAgoBadge({ yearsAgo }: { yearsAgo: number }) {
  return (
    <div className="inline-flex items-baseline gap-1 bg-surface-default/90 backdrop-blur-sm px-2 py-0.5">
      <span className="text-2xl font-bold leading-none text-text-primary">{yearsAgo}</span>
      <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-text-secondary">
        {yearsAgo === 1 ? "yr" : "yrs"} ago
      </span>
    </div>
  );
}

export function EditorialCard({ item }: EditorialCardProps) {
  const { payload, attribution, subKind } = item;
  const { building } = payload;

  const buildingUrl = getBuildingUrl(
    payload.buildingId,
    building.slug,
    building.shortId ?? undefined,
  );

  const heroSrc =
    payload.imageStoragePath ??
    building.communityPreviewUrl ??
    building.mainImageUrl ??
    null;

  return (
    <Link
      to={buildingUrl}
      className="flex flex-col h-full bg-surface-default border border-border-default overflow-hidden group"
    >
      <HeroImage
        src={heroSrc}
        alt={building.name}
        label={
          subKind === "on_this_day" && payload.yearsAgo != null ? (
            <YearsAgoBadge yearsAgo={payload.yearsAgo} />
          ) : subKind === "trending_this_hour" && (payload.recentLikes ?? 0) >= 5 ? (
            <VelocityBadge recentLikes={payload.recentLikes ?? 0} />
          ) : undefined
        }
      />

      <div className="flex flex-col flex-1 justify-between p-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <CardAttribution kind={attribution.kind} text={attribution.text} />
          <h3 className="font-semibold text-sm text-text-primary leading-snug line-clamp-2">
            {building.name}
          </h3>
          {building.city && (
            <p className="text-xs text-text-secondary">{building.city}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          {payload.author && (
            <div className="flex items-center gap-1.5 min-w-0">
              {payload.author.avatarUrl ? (
                <img
                  src={payload.author.avatarUrl}
                  alt={payload.author.username}
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-surface-overlay flex-shrink-0 flex items-center justify-center">
                  <span className="text-[8px] font-medium text-text-secondary uppercase">
                    {payload.author.username[0]}
                  </span>
                </div>
              )}
              <span className="text-[11px] text-text-secondary truncate">
                {payload.author.username}
              </span>
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
