import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import type { CompanyCreditWithBuilding } from "@/features/credits/types";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import { getBuildingUrl } from "@/utils/url";
import { getBuildingImageUrl } from "@/utils/image";
import { cn } from "@/lib/utils";

interface CompanyCreditCardProps {
  credit: CompanyCreditWithBuilding;
  className?: string;
}

export function CompanyCreditCard({ credit, className }: CompanyCreditCardProps) {
  // Locality URL not available: BuildingSummaryForPersonCredit does not include locality_country_code/city_slug — requires credits query to join localities table
  const buildingUrl = getBuildingUrl(credit.building.id, credit.building.slug, credit.building.shortId);
  const thumb =
    getBuildingImageUrl(credit.building.heroImageUrl) ??
    getBuildingImageUrl(credit.building.mainImageUrl) ??
    getBuildingImageUrl(credit.building.communityPreviewUrl);

  const yearPart =
    credit.yearFrom != null && credit.yearTo != null
      ? `${credit.yearFrom}–${credit.yearTo}`
      : credit.yearFrom != null
        ? String(credit.yearFrom)
        : credit.yearTo != null
          ? String(credit.yearTo)
          : null;

  const locality =
    credit.building.city && credit.building.country
      ? `${credit.building.city}, ${credit.building.country}`
      : credit.building.city || credit.building.country || null;

  return (
    <article
      className={cn(
        "flex flex-col gap-4 border-b border-border-default py-6 first:pt-0 last:border-b-0 sm:flex-row sm:gap-6",
        className
      )}
    >
      <Link
        to={buildingUrl}
        className="relative block aspect-4/3 w-full shrink-0 overflow-hidden bg-surface-muted sm:w-32 md:w-40"
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-text-secondary">
            No image
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <Link
            to={buildingUrl}
            className="text-lg font-semibold tracking-tight text-text-primary hover:underline md:text-xl"
          >
            {credit.building.name}
          </Link>
          {locality ? (
            <p className="mt-1 text-sm text-text-secondary">{locality}</p>
          ) : null}
          {credit.building.yearCompleted != null ? (
            <p className="text-sm text-text-secondary">Completed {credit.building.yearCompleted}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant="outline">{formatCreditRoleLabel(credit.role, credit.roleCustom)}</Badge>
          {credit.person ? (
            <Link
              to={`/person/${credit.person.slug}`}
              className="text-sm text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
            >
              {credit.person.name}
            </Link>
          ) : null}
          {yearPart ? <span className="text-sm text-text-secondary">{yearPart}</span> : null}
        </div>
        {credit.contributionNotes?.trim() ? (
          <p className="text-sm leading-relaxed text-text-secondary">{credit.contributionNotes.trim()}</p>
        ) : null}
      </div>
    </article>
  );
}
