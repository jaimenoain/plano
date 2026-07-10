import { Link } from "react-router";
import { Medal, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrimaryCreditsLinks } from "./PrimaryCreditsLinks";
import { visiblePrimaryCredits } from "../../credits/buildingCreditDisplay";
import { formatBuildingStatusForDisplay } from "@/lib/buildingStatus";
import type { BuildingDetails } from "../pages/BuildingDetails";

/**
 * NOTE: this file previously held an unrelated, unused `BuildingHeader`
 * (an inline-edit header for a pre-route `/edit` flow — zero production
 * imports, only its own now-removed test). It has been replaced with the
 * building-detail page header per the design-conformance sweep.
 */
interface BuildingHeaderProps {
  building: BuildingDetails;
  buildingCredits: import("@/features/credits/types").BuildingCreditWithEntities[];
  isStatusBuilding: boolean;
  visitorCount: number;
  totalRatingPoints: number | null;
  buildingUrl: string;
}

/**
 * Title, badges, meta line, visit/point stats and secondary actions for the
 * building detail page. Single instance now — the old hero-overlay vs.
 * no-hero title duplication is gone because the hero band (`BuildingDetailHero`)
 * no longer carries any text; this header always renders on the light surface
 * below it.
 */
export function BuildingHeader({
  building,
  buildingCredits,
  isStatusBuilding,
  visitorCount,
  totalRatingPoints,
  buildingUrl,
}: BuildingHeaderProps) {
  // `winner_award_name` is a loader-only field not captured by the typed
  // `BuildingDetails` interface — a narrow cast, unlike the page's old blanket
  // any-cast (`century` is already typed on `BuildingDetails`, so it needs none).
  const winnerAwardName = (building as { winner_award_name?: string | null }).winner_award_name;
  const primaryCredit = visiblePrimaryCredits(buildingCredits)[0] ?? null;
  const primaryName = primaryCredit?.person?.name ?? primaryCredit?.company?.name ?? null;

  return (
    <div className="mt-16 mb-16 border-b border-border-default">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {(building.tier_rank || isStatusBuilding || winnerAwardName) && (
          <div className="flex flex-wrap items-center gap-2">
            {building.tier_rank && (
              <span className="inline-block rounded-none bg-text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-inverse">
                {building.tier_rank}
              </span>
            )}
            {isStatusBuilding && building.status && (
              <span className="inline-block rounded-none border border-feedback-destructive/20 bg-feedback-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-feedback-destructive">
                {formatBuildingStatusForDisplay(building.status)}
              </span>
            )}
            {winnerAwardName && (
              <span className="inline-flex items-center gap-1 rounded-none border border-border-default px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">
                <Medal className="h-3 w-3" />
                Winner: {winnerAwardName}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="headline">{building.name}.</h1>

            {building.alt_name && (
              <p className="text-base text-text-secondary">{building.alt_name}</p>
            )}

            <div className="body-relaxed flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {primaryName && (
                <span className="flex items-center gap-1.5">
                  <span className="text-text-disabled">by</span>
                  <PrimaryCreditsLinks
                    credits={buildingCredits}
                    linkClassName="text-text-primary font-medium hover:underline underline-offset-2"
                  />
                </span>
              )}
              {(building.year_completed || building.century) && (
                <>
                  <span className="text-border-strong" aria-hidden>·</span>
                  <span>
                    {building.year_completed
                      ? building.year_completed
                      : `${building.century}th c.`}
                  </span>
                </>
              )}
              {(building.city || building.country) && (
                <>
                  <span className="text-border-strong" aria-hidden>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-text-disabled shrink-0" />
                    {[building.city, building.country].filter(Boolean).join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-5 pr-4 border-r border-border-default">
              <div>
                <div className="text-xl font-bold font-display tabular-nums">{visitorCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">Visits</div>
              </div>
              {totalRatingPoints !== null && totalRatingPoints > 0 && (
                <div>
                  <div className="text-xl font-bold font-display tabular-nums">{totalRatingPoints}</div>
                  <div className="text-[10px] uppercase tracking-widest text-text-secondary">Points</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button type="button" className="cta-link">Share</button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
                <Link to={`${buildingUrl}/edit`}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
