import { useCallback } from "react";
import { Link } from "react-router";
import { Medal, Pencil, Share2 } from "lucide-react";
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

/** Quiet uppercase-tracked action — Share / Edit. Not a `.cta-link` (that
 *  injects a → arrow, wrong for these) and not a filled button (too loud). */
const actionClass =
  "group inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-text-secondary transition-colors hover:text-text-primary";

/**
 * Editorial masthead — the building's identity leads the page (the photo now
 * sits *below* it, demoted, so an un-curated UGC shot never greets you first).
 * Eyebrow row: the prestige rank badge first, then the location in place of a
 * generic "Building" label, then status/award chips; the Share/Edit actions
 * tuck quietly to the right. Engagement counts fold into the meta line rather
 * than a boxed stats widget.
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
  const location =
    [building.city, building.country].filter(Boolean).join(", ") || building.address || null;
  const year = building.year_completed
    ? String(building.year_completed)
    : building.century
      ? `${building.century}th c.`
      : null;
  const hasPoints = totalRatingPoints !== null && totalRatingPoints > 0;

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
    <header className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
      {/* Eyebrow row — rank badge, location, status/award chips · quiet actions */}
      <div className="flex items-start justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {building.tier_rank && (
            <span className="inline-block bg-text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-inverse">
              {building.tier_rank}
            </span>
          )}
          {location && <span className="eyebrow tracking-[0.15em]">{location}</span>}
          {isStatusBuilding && building.status && (
            <span className="inline-block border border-feedback-destructive/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-feedback-destructive">
              {formatBuildingStatusForDisplay(building.status)}
            </span>
          )}
          {winnerAwardName && (
            <span className="inline-flex items-center gap-1 border border-border-strong px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary">
              <Medal className="h-3 w-3" aria-hidden />
              Winner: {winnerAwardName}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-5 pt-0.5">
          <button type="button" className={actionClass} onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" aria-hidden /> Share
          </button>
          <Link to={`${buildingUrl}/edit`} className={actionClass}>
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
          </Link>
        </div>
      </div>

      {/* Title */}
      <h1 className="headline-masthead mt-4 pb-[0.15em]">{building.name}.</h1>

      {building.alt_name && (
        <p className="mt-1 text-lg text-text-secondary">{building.alt_name}</p>
      )}

      {/* Meta line — architect + completion, then quiet engagement counts */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        {(primaryName || year) && (
          <p className="text-base md:text-lg text-text-secondary">
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

        <p className="text-[11px] uppercase tracking-[0.15em] text-text-secondary">
          <span className="font-medium tabular-nums text-text-primary">
            {visitorCount.toLocaleString()}
          </span>{" "}
          Visits
          {hasPoints && (
            <>
              <span className="mx-2 text-border-strong" aria-hidden>
                ·
              </span>
              <span className="font-medium tabular-nums text-text-primary">
                {totalRatingPoints.toLocaleString()}
              </span>{" "}
              Points
            </>
          )}
        </p>
      </div>
    </header>
  );
}
