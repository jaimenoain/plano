import { Link } from "react-router";
import { Camera } from "lucide-react";
import { EntityHero } from "@/components/media/EntityHero";
import { HeroIdentity } from "@/components/media/HeroIdentity";
import { getBuildingImageUrl } from "@/utils/image";
import { resolveBuildingUrl } from "@/utils/url";
import type { CountryEssential } from "../../api/countryGuideApi";

/**
 * CountryHero — the photography-first band the city guides already use, so a
 * country reads like a destination rather than a directory index.
 *
 * Countries own no photograph of their own, so the lead image is the best-
 * photographed building in the country, credited by name and linked. Falls back
 * to the typographic treatment when nothing in the country has a photo.
 */
export function CountryHero({
  countryName,
  countryCode,
  continent,
  lead,
}: {
  countryName: string;
  countryCode: string;
  continent: string | null;
  /** The country's top building; supplies the hero photograph and its credit. */
  lead: CountryEssential | null;
}) {
  const imageUrl = getBuildingImageUrl(lead?.image_url ?? null) ?? null;

  if (!imageUrl) {
    return (
      <header className="border-b border-border-default bg-surface-default">
        <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="space-y-3">
            {continent ? (
              <Link
                to="/guides"
                className="inline-flex w-fit text-2xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
              >
                {continent}
              </Link>
            ) : null}
            <h1 className="display text-text-primary">{countryName}</h1>
          </div>
        </div>
      </header>
    );
  }

  return (
    <EntityHero
      heroImageUrl={imageUrl}
      alt={`Architecture in ${countryName}`}
      placeholderLabel={countryName}
      heightClassName="h-[clamp(300px,55vh,650px)]"
      overlay={
        <div className="flex w-full flex-col gap-6">
          <HeroIdentity>
            {continent ? (
              <Link
                to="/guides"
                className="inline-flex w-fit text-2xs font-medium uppercase tracking-widest text-text-inverse/75 transition-colors hover:text-text-inverse"
              >
                {continent}
              </Link>
            ) : null}
            <h1 className="display text-text-inverse">{countryName}</h1>
          </HeroIdentity>
          {lead ? (
            <div className="meta-code flex items-center justify-end gap-1.5 text-2xs text-text-inverse/70">
              <Camera className="h-3 w-3 shrink-0" aria-hidden />
              <Link
                to={resolveBuildingUrl({
                  id: lead.id,
                  slug: lead.slug,
                  short_id: lead.short_id,
                  locality_country_code: countryCode,
                  locality_city_slug: lead.city_slug,
                })}
                className="transition-colors hover:text-text-inverse"
              >
                {lead.name}
                {lead.city ? `, ${lead.city}` : ""}
              </Link>
            </div>
          ) : null}
        </div>
      }
    />
  );
}
