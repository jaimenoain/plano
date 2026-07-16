import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { getBuildingImageUrl } from "@/utils/image";
import { fetchSpotlightPool } from "../../api/railApi";
import { dateKey, pickBuildingOfTheDay } from "../../utils/buildingOfTheDay";
import { RailHeader, RailModule } from "@/components/ui/rail";

/**
 * "Today" — the rail's one large photograph. A daily edition drawn from the
 * most popular buildings with a hero image: same pick for everyone, rotates
 * with the calendar date (see utils/buildingOfTheDay.ts).
 */
export function BuildingOfTheDay() {
  const today = new Date();
  const key = dateKey(today);

  const { data, isLoading } = useQuery({
    queryKey: ["feed-sidebar", "building-of-the-day", key],
    queryFn: fetchSpotlightPool,
    staleTime: 60 * 60 * 1000,
  });

  const building = pickBuildingOfTheDay(data ?? [], key);
  if (!isLoading && !building) return null;

  const dateline = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (isLoading || !building) {
    return (
      <RailModule>
        <RailHeader label="Today" meta={dateline} />
        <div className="animate-pulse">
          <div className="aspect-[4/3] w-full bg-surface-muted" />
          <div className="mt-3.5 h-4 w-2/3 bg-surface-muted" />
          <div className="mt-2 h-3 w-1/3 bg-surface-muted" />
        </div>
      </RailModule>
    );
  }

  const href = `/building/${building.id}${building.slug ? `/${building.slug}` : ""}`;
  const image = getBuildingImageUrl(
    building.hero_image_url ?? building.community_preview_url,
  );
  const location = [building.city, building.country].filter(Boolean).join(", ");
  const meta = [location, building.year_completed].filter(Boolean).join(" · ");

  return (
    <RailModule>
      <RailHeader label="Today" meta={dateline} />
      <Link to={href} className="group block">
        {image ? (
          <img
            src={image}
            alt={building.name}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-none bg-surface-muted object-cover"
          />
        ) : (
          <div
            className="photo-placeholder aspect-[4/3] w-full"
            data-label={building.name}
            aria-hidden
          />
        )}
        <h3 className="mt-3.5 text-xl font-semibold leading-snug text-text-primary">
          {building.name}
        </h3>
        {meta && <p className="mt-1 text-[11px] text-text-secondary">{meta}</p>}
      </Link>
      <div className="mt-4">
        <Link to={href} className="cta-link">
          View building
        </Link>
      </div>
    </RailModule>
  );
}
