import { Link } from "react-router";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * NOTE: this file previously held an unrelated, unused `BuildingHeader`
 * (an inline-edit header for a pre-route `/edit` flow — zero production
 * imports, only its own now-removed test). It has been replaced with the
 * building-detail page header per the design-conformance sweep.
 */
interface BuildingHeaderProps {
  visitorCount: number;
  totalRatingPoints: number | null;
  buildingUrl: string;
}

/**
 * Compact stats + actions bar directly below the hero band. The building
 * identity (badges, title, architect, place) is overlaid on the hero itself by
 * `BuildingHeroIdentity`, so this bar carries only the visit/point stats and
 * the secondary Share/Edit actions.
 */
export function BuildingHeader({
  visitorCount,
  totalRatingPoints,
  buildingUrl,
}: BuildingHeaderProps) {
  return (
    <div className="border-b border-border-default">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xl font-bold font-display tabular-nums leading-none">{visitorCount}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-text-secondary">Visits</div>
          </div>
          {totalRatingPoints !== null && totalRatingPoints > 0 && (
            <div className="pl-6 border-l border-border-default">
              <div className="text-xl font-bold font-display tabular-nums leading-none">{totalRatingPoints}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-text-secondary">Points</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button type="button" className="cta-link">Share</button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" asChild>
            <Link to={`${buildingUrl}/edit`}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
