import type { ReactNode } from "react";
import { BadgeCheck, ExternalLink, Pencil } from "lucide-react";
import { EntityHero } from "@/components/entity/EntityHero";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Company } from "../types";
import { EntityMetaEyebrow } from "./EntityMetaEyebrow";

interface CompanyHeroProps {
  company: Company;
  /** Preformatted `founded–dissolved` span, or null when unknown. */
  yearSpan: string | null;
  /** Stewards (and owners) get the edit affordance; everyone else gets `visitorActions`. */
  isSteward: boolean;
  onEdit: () => void;
  /**
   * Action slot for visitors — the follow control once companies can be
   * followed. Empty today: a company has no single claimant, so there is no
   * `company_follows` twin table yet (see the PR notes).
   */
  visitorActions?: ReactNode;
}

/**
 * Company-page hero on the shared `EntityHero` shell — same geometry as the
 * person and profile heroes, with the practice drawn square rather than round.
 */
export function CompanyHero({ company, yearSpan, isSteward, onEdit, visitorActions }: CompanyHeroProps) {
  const website = company.website?.trim();

  const badges =
    company.claimStatus === "verified" ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-x-2" tabIndex={0} aria-label="Verified company on Plano">
            <BadgeCheck className="size-3.5 shrink-0 text-text-primary" aria-hidden />
            <span className="eyebrow tracking-widest">Verified</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Verified company on Plano</TooltipContent>
      </Tooltip>
    ) : null;

  const actions = isSteward ? (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex min-h-11 min-w-11 items-center justify-center text-text-disabled transition-colors hover:text-text-primary active:text-text-primary md:min-h-0 md:min-w-0 md:p-0"
      aria-label="Edit company"
    >
      <Pencil className="size-3.5" />
    </button>
  ) : (
    visitorActions
  );

  return (
    <EntityHero
      avatar={{
        url: company.logoUrl,
        alt: `${company.name} logo`,
        fallbackInitial: company.name[0]?.toUpperCase() ?? "",
        // A practice is drawn square; a person is drawn round.
        shape: "square",
      }}
      badges={badges}
      actions={actions}
      eyebrow={
        <div className="mb-2">
          <EntityMetaEyebrow items={[company.country, yearSpan]} />
        </div>
      }
      title={company.name}
    >
      <div className="mt-5 space-y-3">
        {company.bio?.trim() && <p className="body-relaxed max-w-[56ch] text-base">{company.bio.trim()}</p>}
        {website && (
          <a
            href={website.startsWith("http") ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
          >
            {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </EntityHero>
  );
}
