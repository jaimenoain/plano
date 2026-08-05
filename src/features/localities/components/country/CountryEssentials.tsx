import { Link } from "react-router";
import { getBuildingImageUrl } from "@/utils/image";
import { resolveBuildingUrl } from "@/utils/url";
import { SectionLabel } from "../SectionLabel";
import type { CountryEssential } from "../../api/countryGuideApi";

function buildingHref(countryCode: string, b: CountryEssential): string {
  return resolveBuildingUrl({
    id: b.id,
    slug: b.slug,
    short_id: b.short_id,
    locality_country_code: countryCode,
    locality_city_slug: b.city_slug,
  });
}

/** City + year caption — the two things that place a building on a trip. */
function Caption({ b, muted }: { b: CountryEssential; muted?: boolean }) {
  const parts = [b.city, b.year_completed ? String(b.year_completed) : null].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p
      className={`text-2xs font-medium uppercase tracking-widest ${
        muted ? "text-white/55" : "text-text-disabled"
      }`}
    >
      {parts.join(" · ")}
    </p>
  );
}

/**
 * CountryEssentials — "Start here": the country's best-known buildings, led by
 * one full-width photograph. The lead is dropped when the hero band above is
 * already showing it, so the same photo never appears twice on one screen.
 */
export function CountryEssentials({
  buildings,
  countryCode,
  totalCount,
  /**
   * The building whose photograph the hero band above is already using, so it
   * is never shown twice on one screen. Null when the country has no photo at
   * all — then this section leads with its own (placeholder) feature instead.
   */
  heroBuildingId,
}: {
  buildings: CountryEssential[];
  countryCode: string;
  totalCount: number;
  heroBuildingId: string | null;
}) {
  const list = buildings.filter((b) => b.id !== heroBuildingId);
  if (list.length === 0) return null;

  const [first, ...rest] = list;
  const hero = heroBuildingId == null ? first : null;
  const grid = heroBuildingId == null ? rest : list;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <SectionLabel>Start here</SectionLabel>
          <p className="mt-2 max-w-xl text-sm text-text-secondary">
            The buildings members visit and photograph most in this country.
          </p>
        </div>
        <Link to="/map" className="cta-link shrink-0">
          All {totalCount.toLocaleString("en")}
        </Link>
      </div>

      {hero ? (
        <Link to={buildingHref(countryCode, hero)} className="group mb-3 block">
          <div className="relative aspect-video overflow-hidden">
            {hero.image_url ? (
              <>
                <img
                  src={getBuildingImageUrl(hero.image_url) ?? ""}
                  alt={hero.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <Caption b={hero} muted />
                  <h3 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
                    {hero.name}
                  </h3>
                </div>
              </>
            ) : (
              <div className="photo-placeholder size-full" data-label={hero.name} />
            )}
          </div>
          {hero.image_url ? null : (
            <div className="mt-3">
              <Caption b={hero} />
              <h3 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-text-primary transition-colors group-hover:text-text-secondary sm:text-3xl">
                {hero.name}
              </h3>
            </div>
          )}
        </Link>
      ) : null}

      {grid.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
          {grid.map((b) => (
            <Link key={b.id} to={buildingHref(countryCode, b)} className="group block">
              <div className="aspect-4/3 overflow-hidden">
                {b.image_url ? (
                  <img
                    src={getBuildingImageUrl(b.image_url) ?? ""}
                    alt={b.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="photo-placeholder size-full" data-label={b.name} />
                )}
              </div>
              <div className="mt-2.5">
                <Caption b={b} />
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-text-primary transition-colors group-hover:text-text-secondary">
                  {b.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
