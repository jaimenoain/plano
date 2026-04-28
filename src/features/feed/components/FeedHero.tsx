import { formatDistanceToNow } from "date-fns";
import { getBuildingImageUrl } from "@/utils/image";
import type { FeedReview } from "@/types/feed";
import { PointsBadge } from "./card-primitives";

interface FeedHeroProps {
  hero: FeedReview;
  queue: FeedReview[];
}

export function FeedHero({ hero, queue }: FeedHeroProps) {
  const heroImageUrl =
    getBuildingImageUrl(hero.building.main_image_url) ??
    getBuildingImageUrl(hero.images?.[0]?.url);
  const architect = hero.building.creditedEntities?.[0]?.name ?? null;

  return (
    <section className="px-4 md:px-6 lg:px-16 pt-14 pb-16 border-b border-text-primary">
      {/* Desktop: 2-column layout */}
      <div
        className="hidden md:grid gap-10 items-start"
        style={{ gridTemplateColumns: "1.6fr 1fr" }}
      >
        {/* Left: primary photo + caption */}
        <figure className="m-0">
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={hero.building.name}
              className="w-full object-cover block rounded-none"
              style={{ aspectRatio: "16/10" }}
            />
          ) : (
            <div className="w-full bg-surface-muted rounded-none" style={{ aspectRatio: "16/10" }} />
          )}
          <figcaption className="mt-4 flex flex-col gap-1.5">
            <p className="text-[22px] font-semibold leading-snug tracking-[-0.02em] text-text-primary">
              {hero.building.name}
              {architect && (
                <span className="font-normal italic text-text-secondary"> by {architect}</span>
              )}
            </p>
            <p className="font-mono text-[10px] text-text-disabled uppercase tracking-[0.14em]">
              {[hero.building.city, hero.building.year_completed]
                .filter(Boolean)
                .join(" · ")}
              {hero.user.username ? ` · reviewed by ${hero.user.username}` : ""}
            </p>
          </figcaption>
        </figure>

        {/* Right: queue list */}
        <ol className="list-none m-0 p-0 divide-y divide-border-default">
          {queue.map((entry) => {
            const thumbUrl =
              getBuildingImageUrl(entry.building.main_image_url) ??
              getBuildingImageUrl(entry.images?.[0]?.url);
            const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });
            return (
              <li
                key={entry.id}
                className="grid items-start gap-4 py-4 first:pt-0 last:pb-0"
                style={{ gridTemplateColumns: "64px 1fr auto" }}
              >
                <div className="w-16 h-16 shrink-0 overflow-hidden bg-surface-muted rounded-none">
                  {thumbUrl && (
                    <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="font-medium text-[15px] text-text-primary leading-tight tracking-[-0.01em] truncate">
                    {entry.building.name}
                  </p>
                  <p className="font-mono text-[10px] text-text-disabled uppercase tracking-[0.08em] mt-1.5 flex gap-1.5 items-baseline">
                    <span className="text-text-secondary not-uppercase normal-case">{entry.user.username}</span>
                    <span>·</span>
                    <span>{timeAgo}</span>
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <PointsBadge points={entry.rating ?? 0} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile: hero image + caption only */}
      <div className="md:hidden">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt={hero.building.name}
            className="w-full object-cover block rounded-none"
            style={{ aspectRatio: "16/10" }}
          />
        ) : (
          <div className="w-full bg-surface-muted rounded-none" style={{ aspectRatio: "16/10" }} />
        )}
        <div className="mt-4 space-y-1">
          <p className="text-[18px] font-semibold tracking-[-0.02em] text-text-primary leading-snug">
            {hero.building.name}
          </p>
          {architect && (
            <p className="text-[13px] font-normal italic text-text-secondary">{architect}</p>
          )}
          <p className="font-mono text-[10px] text-text-disabled uppercase tracking-[0.14em]">
            {[hero.building.city, hero.building.year_completed].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </section>
  );
}
