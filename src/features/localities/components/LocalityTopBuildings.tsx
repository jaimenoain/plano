import { Link } from "react-router";
import { Building2 } from "lucide-react";
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
        <Link
          to={`/architecture/${countryCode}/${citySlug}`}
          className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
        >
          All {totalCount.toLocaleString()} →
        </Link>
      </div>

      {/* Hero building — full-width feature card */}
      <Link to={heroUrl} className="group mb-3 block overflow-hidden border border-border-default">
        <div className="relative aspect-video overflow-hidden bg-surface-muted">
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
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-white/55">
                    {hero.year_completed}
                  </p>
                ) : null}
                <h3 className="text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
                  {hero.name}
                </h3>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col justify-end bg-surface-muted p-5 sm:p-6">
              {hero.year_completed ? (
                <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-text-disabled">
                  {hero.year_completed}
                </p>
              ) : null}
              <h3 className="text-xl font-bold leading-tight tracking-tight text-text-primary sm:text-2xl">
                {hero.name}
              </h3>
            </div>
          )}
        </div>
      </Link>

      {/* Secondary buildings — 2-col mobile, 3-col desktop */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {secondary.map((b) => {
            const url = getBuildingLocalityUrl(countryCode, citySlug, b.id, b.slug, b.short_id);
            return (
              <Link
                key={b.id}
                to={url}
                className="group block overflow-hidden border border-border-default"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-surface-muted">
                  {b.main_image_url ? (
                    <>
                      <img
                        src={getBuildingImageUrl(b.main_image_url) ?? ""}
                        alt={b.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/65 to-transparent" />
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-muted">
                      <Building2 className="h-8 w-8 text-text-disabled" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {b.year_completed ? (
                      <p className="text-[9px] font-medium uppercase tracking-widest text-white/55">
                        {b.year_completed}
                      </p>
                    ) : null}
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">
                      {b.name}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
