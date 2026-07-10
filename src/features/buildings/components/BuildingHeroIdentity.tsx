import { Medal } from "lucide-react";
import { HeroIdentity } from "@/components/media/HeroIdentity";
import { PrimaryCreditsLinks } from "./PrimaryCreditsLinks";
import { visiblePrimaryCredits } from "../../credits/buildingCreditDisplay";
import { formatBuildingStatusForDisplay } from "@/lib/buildingStatus";
import type { BuildingDetails } from "../pages/BuildingDetails";

interface BuildingHeroIdentityProps {
  building: BuildingDetails;
  buildingCredits: import("@/features/credits/types").BuildingCreditWithEntities[];
  isStatusBuilding: boolean;
}

/**
 * Building identity (badges, name, architect, year, place) rendered as the
 * overlay on the hero band. Light-on-dark treatment: it sits over the bottom
 * gradient of the cropped photo. The stats + actions chrome lives below the
 * band in {@link BuildingHeader}.
 */
export function BuildingHeroIdentity({
  building,
  buildingCredits,
  isStatusBuilding,
}: BuildingHeroIdentityProps) {
  const winnerAwardName = (building as { winner_award_name?: string | null }).winner_award_name;
  const primaryCredit = visiblePrimaryCredits(buildingCredits)[0] ?? null;
  const primaryName = primaryCredit?.person?.name ?? primaryCredit?.company?.name ?? null;
  const place = [building.city, building.country].filter(Boolean).join(", ");
  const year = building.year_completed
    ? String(building.year_completed)
    : building.century
      ? `${building.century}th c.`
      : null;

  return (
    <HeroIdentity>
      {(building.tier_rank || isStatusBuilding || winnerAwardName) && (
        <div className="flex flex-wrap items-center gap-2">
          {building.tier_rank && (
            <span className="inline-block rounded-none bg-text-inverse px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">
              {building.tier_rank}
            </span>
          )}
          {isStatusBuilding && building.status && (
            <span className="inline-block rounded-none border border-white/30 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-inverse">
              {formatBuildingStatusForDisplay(building.status)}
            </span>
          )}
          {winnerAwardName && (
            <span className="inline-flex items-center gap-1 rounded-none border border-white/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-inverse">
              <Medal className="h-3 w-3" />
              Winner: {winnerAwardName}
            </span>
          )}
        </div>
      )}

      {(place || year) && (
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
          {[place, year].filter(Boolean).join(" · ")}
        </div>
      )}

      <h1 className="headline text-text-inverse">{building.name}.</h1>

      {building.alt_name && (
        <p className="text-base text-white/70">{building.alt_name}</p>
      )}

      {primaryName && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-white/85">
          <span className="text-white/55">by</span>
          <PrimaryCreditsLinks
            credits={buildingCredits}
            linkClassName="text-text-inverse font-medium hover:underline underline-offset-2"
          />
        </div>
      )}
    </HeroIdentity>
  );
}
