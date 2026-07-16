import { RailHeader, RailModule } from "@/components/ui/rail";
import {
  BuildingCreditsPreview,
  type BuildingCreditsPreviewProps,
} from "./BuildingCredits";
import { BuildingContributorsInline } from "./BuildingContributorsInline";

/**
 * Tab-conditional rail modules for the building-detail sidebar, in the shared
 * rail grammar (`@/components/ui/rail`). Extracted from the page so
 * BuildingDetails.tsx stays under its frozen line cap.
 */

export function CreditsRailModule({
  credits,
  isAuthenticated,
  onShowAll,
}: {
  credits: BuildingCreditsPreviewProps["credits"];
  isAuthenticated: boolean;
  onShowAll: () => void;
}) {
  return (
    <RailModule>
      <RailHeader
        label="Credits"
        meta={
          <button type="button" onClick={onShowAll} className="cta-link text-[10px]">
            All
          </button>
        }
      />
      <BuildingCreditsPreview credits={credits} isAuthenticated={isAuthenticated} />
    </RailModule>
  );
}

export function ContributorsRailModule({ buildingId }: { buildingId: string }) {
  return (
    <RailModule id="contributors" className="scroll-mt-24">
      <RailHeader label="Page contributors" />
      <p className="mb-3 text-[11px] leading-relaxed text-text-secondary">
        People who added photos, credits, or edits to this listing.
      </p>
      <BuildingContributorsInline buildingId={buildingId} />
    </RailModule>
  );
}
