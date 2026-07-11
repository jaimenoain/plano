import { useCallback } from "react";
import { Link } from "react-router";
import { Medal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatBuildingStatusForDisplay } from "@/lib/buildingStatus";
import { visiblePrimaryCredits } from "../../credits/buildingCreditDisplay";
import { PrimaryCreditsLinks } from "./PrimaryCreditsLinks";
import type { BuildingCreditWithEntities } from "../../credits/types";
import type { BuildingDetails } from "../pages/BuildingDetails";

interface BuildingMastheadProps {
  building: BuildingDetails;
  buildingCredits: BuildingCreditWithEntities[];
  isStatusBuilding: boolean;
  visitorCount: number;
  totalRatingPoints: number | null;
  buildingUrl: string;
}

/**
 * Editorial masthead below the photo band: eyebrow + badges, the giant
 * headline, the architect line, and the stats/actions column — the magazine
 * treatment from the design mock (building-detail.html). Absorbs the old
 * hero-overlay identity and the stats bar.
 */
export function BuildingMasthead({
  building,
  buildingCredits,
  isStatusBuilding,
  visitorCount,
  totalRatingPoints,
  buildingUrl,
}: BuildingMastheadProps) {
  const { toast } = useToast();
  const winnerAwardName = (building as { winner_award_name?: string | null }).winner_award_name;
  const primaryName =
    visiblePrimaryCredits(buildingCredits)[0]?.person?.name ??
    visiblePrimaryCredits(buildingCredits)[0]?.company?.name ??
    null;
  const year = building.year_completed
    ? String(building.year_completed)
    : building.century
      ? `${building.century}th c.`
      : null;

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${buildingUrl}`;
    if (navigator.share) {
      void navigator.share({ title: building.name, url }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(url).then(() => {
        toast({ title: "Link copied to clipboard" });
      });
    }
  }, [building.name, buildingUrl, toast]);

  return (
    <header className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">

        {/* Identity */}
        <div className="min-w-[280px] flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="eyebrow tracking-[0.15em]">Building</span>
            {building.tier_rank && (
              <span className="inline-block rounded-none bg-text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-inverse">
                {building.tier_rank}
              </span>
            )}
            {isStatusBuilding && building.status && (
              <span className="inline-block rounded-none border border-feedback-destructive/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-feedback-destructive">
                {formatBuildingStatusForDisplay(building.status)}
              </span>
            )}
            {winnerAwardName && (
              <span className="inline-flex items-center gap-1 rounded-none border border-border-strong px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">
                <Medal className="h-3 w-3" aria-hidden />
                Winner: {winnerAwardName}
              </span>
            )}
          </div>

          <h1 className="headline-masthead mt-2 pb-[0.15em]">{building.name}.</h1>

          {building.alt_name && (
            <p className="mt-1 text-lg text-text-secondary">{building.alt_name}</p>
          )}

          {(primaryName || year) && (
            <p className="mt-4 text-base md:text-lg text-text-secondary">
              {primaryName ? (
                <>
                  By{" "}
                  <PrimaryCreditsLinks
                    credits={buildingCredits}
                    linkClassName="text-text-primary border-b border-border-default pb-0.5 transition-colors hover:border-text-primary"
                  />
                  {year ? <>, completed {year}.</> : "."}
                </>
              ) : (
                <>Completed {year}.</>
              )}
            </p>
          )}
        </div>

        {/* Stats + actions */}
        <div className="flex items-center gap-6 shrink-0 pb-1.5">
          <div>
            <div className="text-2xl font-bold tabular-nums leading-none">{visitorCount}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-text-secondary">Visits</div>
          </div>
          {totalRatingPoints !== null && totalRatingPoints > 0 && (
            <div className="pl-6 border-l border-border-default">
              <div className="text-2xl font-bold tabular-nums leading-none">{totalRatingPoints}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-text-secondary">Points</div>
            </div>
          )}
          <div className="flex items-center gap-4 pl-2">
            <button type="button" className="cta-link" onClick={handleShare}>
              Share
            </button>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
              <Link to={`${buildingUrl}/edit`}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
          </div>
        </div>

      </div>
    </header>
  );
}
