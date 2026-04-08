import { Link } from "react-router";
import type { BuildingCreditWithEntities } from "@/features/credits/types";
import {
  visiblePrimaryCredits,
} from "@/features/credits/buildingCreditDisplay";

interface PrimaryCreditsLinksProps {
  credits: BuildingCreditWithEntities[];
  /** Applied to each entity link */
  linkClassName: string;
  className?: string;
}

/**
 * Renders primary-tier credits as links to `/person/:slug` and/or `/company/:slug`.
 * Person + company: "Person @ Company" with separate links.
 */
export function PrimaryCreditsLinks({
  credits,
  linkClassName,
  className,
}: PrimaryCreditsLinksProps) {
  const primary = visiblePrimaryCredits(credits).filter(
    (c) => c.person != null || c.company != null,
  );
  if (primary.length === 0) return null;

  return (
    <span className={className}>
      {primary.map((credit, i) => (
        <span key={credit.id}>
          {credit.person && (
            <Link to={`/person/${credit.person.slug}`} className={linkClassName}>
              {credit.person.name}
            </Link>
          )}
          {credit.person && credit.company && (
            <span className="text-text-secondary"> @ </span>
          )}
          {credit.company && (
            <Link to={`/company/${credit.company.slug}`} className={linkClassName}>
              {credit.company.name}
            </Link>
          )}
          {i < primary.length - 1 && <span className="text-text-secondary">, </span>}
        </span>
      ))}
    </span>
  );
}
