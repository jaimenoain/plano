import { BadgeCheck, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Company } from "../types";

function AboutBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs mb-1.5 font-medium uppercase tracking-widest text-text-disabled">{label}</p>
      {children}
    </div>
  );
}

/** About tab body — same label/value grammar as the person and profile About tabs. */
export function CompanyAboutSection({
  company,
  yearSpan,
}: {
  company: Company;
  /** Preformatted `founded–dissolved` span, or null when unknown. */
  yearSpan: string | null;
}) {
  const website = company.website?.trim();
  const isVerified = company.claimStatus === "verified";

  const hasAnyContent = Boolean(company.bio?.trim() || website || company.country || yearSpan) || isVerified;

  if (!hasAnyContent) {
    return (
      <EmptyState
        eyebrow="No details yet"
        message="Details about this practice haven't been added yet."
      />
    );
  }

  return (
    <div className="max-w-md space-y-10">
      <div className="space-y-6">
        {company.bio?.trim() && (
          <AboutBlock label="About">
            <p className="text-base leading-relaxed text-text-primary">{company.bio.trim()}</p>
          </AboutBlock>
        )}
        {website && (
          <AboutBlock label="Website">
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-text-primary transition-opacity hover:opacity-60"
            >
              {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ExternalLink className="h-3 w-3 text-text-disabled" />
            </a>
          </AboutBlock>
        )}
        {company.country && (
          <AboutBlock label="Country">
            <p className="text-base text-text-primary">{company.country}</p>
          </AboutBlock>
        )}
        {yearSpan && (
          <AboutBlock label="Active">
            <p className="text-base tabular-nums text-text-primary">{yearSpan}</p>
          </AboutBlock>
        )}
      </div>

      {isVerified && (
        <AboutBlock label="Identity">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            Verified company on Plano
          </div>
          {company.verifiedDomain && (
            <p className="mt-1.5 font-mono text-2xs uppercase tracking-[0.14em] text-text-secondary">
              {company.verifiedDomain}
            </p>
          )}
        </AboutBlock>
      )}
    </div>
  );
}
