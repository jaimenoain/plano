import { Link } from "react-router";
import { Camera } from "lucide-react";
import { EntityHero } from "@/components/media/EntityHero";
import { HeroIdentity } from "@/components/media/HeroIdentity";
import { getBuildingImageUrl } from "@/utils/image";

// ---------------------------------------------------------------------------
// LocalityHero — photography-first hero with overlay title, or typographic fall‑back
// ---------------------------------------------------------------------------
export function LocalityHero({
  city,
  country,
  countryCode,
  region,
  heroImageUrl,
  heroCreditUsername,
  heroSourceBuilding,
}: {
  city: string;
  country: string;
  countryCode: string;
  region: string | null;
  heroImageUrl: string | null;
  heroCreditUsername?: string | null;
  heroSourceBuilding?: string | null;
}) {
  const absoluteUrl = getBuildingImageUrl(heroImageUrl) ?? null;
  const cc = countryCode.toLowerCase();

  const eyebrow = (
    <Link
      to={`/architecture/${cc}`}
      className="inline-flex w-fit text-2xs font-medium uppercase tracking-widest text-text-inverse/75 transition-colors hover:text-text-inverse"
    >
      {country}
    </Link>
  );

  const eyebrowMuted = (
    <Link
      to={`/architecture/${cc}`}
      className="inline-flex w-fit text-2xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
    >
      {country}
    </Link>
  );

  if (absoluteUrl) {
    return (
      <EntityHero
        heroImageUrl={absoluteUrl}
        alt={`${city}, ${country}`}
        placeholderLabel={city}
        heightClassName="h-[clamp(300px,55vh,650px)]"
        overlay={
          <div className="flex w-full flex-col gap-6">
            <HeroIdentity>
              {eyebrow}
              {region ? (
                <p className="text-2xs-plus font-medium uppercase tracking-widest text-text-inverse/60">
                  {region}
                </p>
              ) : null}
              <h1 className="display text-text-inverse">{city}</h1>
            </HeroIdentity>
            {heroCreditUsername ? (
              <div className="meta-code flex items-center justify-end gap-1.5 text-2xs text-text-inverse/70">
                <Camera className="h-3 w-3 shrink-0" aria-hidden />
                <span>
                  {heroSourceBuilding ? <>{heroSourceBuilding} · </> : null}
                  Foto:{" "}
                  <Link
                    to={`/profile/${heroCreditUsername}`}
                    className="transition-colors hover:text-text-inverse"
                  >
                    {heroCreditUsername}
                  </Link>
                </span>
              </div>
            ) : null}
          </div>
        }
      />
    );
  }

  return (
    <header className="border-b border-border-default bg-surface-default">
      <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="space-y-3">
          {eyebrowMuted}
          {region ? (
            <p className="text-2xs-plus font-medium uppercase tracking-widest text-text-disabled">
              {region}
            </p>
          ) : null}
          <h1 className="display text-text-primary">{city}</h1>
        </div>
      </div>
    </header>
  );
}
