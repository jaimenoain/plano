import { Link } from "react-router";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingLocalityUrl } from "@/utils/url";
import type { LocalityBuildingDTO } from "../types";
import { SectionLabel } from "./SectionLabel";

// ---------------------------------------------------------------------------
// LocalityTopBuildings — editorial showcase (replaces the infinite-scroll list)
// ---------------------------------------------------------------------------
export function LocalityTopBuildings({
  buildings,
  totalCount,
  citySlug,
  countryCode,
}: {
  buildings: LocalityBuildingDTO[];
  totalCount: number;
  citySlug: string;
  countryCode: string;
}) {
  if (buildings.length === 0) return null;

  const [hero, ...rest] = buildings;
  const secondary = rest.slice(0, 5);

  const heroUrl = getBuildingLocalityUrl(countryCode, citySlug, hero.id, hero.slug, hero.short_id);

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-8 flex items-center justify-between gap-2">
        <SectionLabel>Top buildings</SectionLabel>
        <Link to={`/architecture/${countryCode}/${citySlug}`} className="cta-link">
          All {totalCount.toLocaleString()}
        </Link>
      </div>

      {/* Hero building — unboxed 16/9 feature. With a photo the name sits on the
          scrim; without one the slot becomes a .photo-placeholder and the name
          drops below it, so the caption never collides with the heading. */}
      <Link to={heroUrl} className="group mb-3 block">
        <div className="relative aspect-video overflow-hidden">
          {hero.main_image_url ? (
            <>
              <img
                src={getBuildingImageUrl(hero.main_image_url) ?? ""}
                alt={hero.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                {hero.year_completed ? (
                  <p className="mb-1 text-2xs font-medium uppercase tracking-widest text-white/55">
                    {hero.year_completed}
                  </p>
                ) : null}
                <h3 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
                  {hero.name}
                </h3>
              </div>
            </>
          ) : (
            <div
              className="photo-placeholder size-full"
              data-label={hero.year_completed ? String(hero.year_completed) : "No photo"}
            />
          )}
        </div>
        {hero.main_image_url ? null : (
          <div className="mt-3">
            {hero.year_completed ? (
              <p className="mb-1 text-2xs font-medium uppercase tracking-widest text-text-disabled">
                {hero.year_completed}
              </p>
            ) : null}
            <h3 className="text-2xl font-bold leading-tight tracking-tight text-text-primary transition-colors group-hover:text-text-secondary sm:text-3xl">
              {hero.name}
            </h3>
          </div>
        )}
      </Link>

      {/* Secondary buildings — unboxed 4/3 image, name below in black type */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
          {secondary.map((b) => {
            const url = getBuildingLocalityUrl(countryCode, citySlug, b.id, b.slug, b.short_id);
            return (
              <Link key={b.id} to={url} className="group block">
                <div className="aspect-4/3 overflow-hidden">
                  {b.main_image_url ? (
                    <img
                      src={getBuildingImageUrl(b.main_image_url) ?? ""}
                      alt={b.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="photo-placeholder size-full" data-label={b.name} />
                  )}
                </div>
                {b.year_completed ? (
                  <p className="mt-2.5 text-2xs font-medium uppercase tracking-widest text-text-disabled">
                    {b.year_completed}
                  </p>
                ) : null}
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-text-primary transition-colors group-hover:text-text-secondary">
                  {b.name}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
