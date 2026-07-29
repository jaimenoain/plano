import { BadgeCheck, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Person } from "../types";

function AboutBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs mb-1.5 font-medium uppercase tracking-widest text-text-disabled">{label}</p>
      {children}
    </div>
  );
}

/** About tab body — same label/value grammar as the profile page's About tab. */
export function PersonAboutSection({ person, lifeSpan }: { person: Person; lifeSpan: string | null }) {
  const website = person.website?.trim();

  const hasAnyContent =
    Boolean(person.bio?.trim() || website || person.nationality || lifeSpan || person.locationNote) ||
    person.claimStatus === "verified";

  if (!hasAnyContent) {
    return (
      <EmptyState
        eyebrow="No details yet"
        message="Biographical details for this person haven't been added yet."
      />
    );
  }

  return (
    <div className="max-w-md space-y-10">
      <div className="space-y-6">
        {person.bio?.trim() && (
          <AboutBlock label="Bio">
            <p className="text-base leading-relaxed text-text-primary">{person.bio.trim()}</p>
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
        {person.nationality && (
          <AboutBlock label="Nationality">
            <p className="text-base text-text-primary">{person.nationality}</p>
          </AboutBlock>
        )}
        {lifeSpan && (
          <AboutBlock label="Life">
            <p className="text-base tabular-nums text-text-primary">{lifeSpan}</p>
          </AboutBlock>
        )}
        {person.locationNote && (
          <AboutBlock label="Location">
            <p className="text-base text-text-primary">{person.locationNote}</p>
          </AboutBlock>
        )}
      </div>

      {person.claimStatus === "verified" && (
        <AboutBlock label="Identity">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            Identity verified by Plano
          </div>
        </AboutBlock>
      )}
    </div>
  );
}
