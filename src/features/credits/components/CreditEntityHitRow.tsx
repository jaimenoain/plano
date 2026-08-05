import { Building2, User } from "lucide-react";
import type { CompanySummary, PersonSummary } from "../types";

/** One search hit in the credits entity picker, tagged with which table it came from. */
export type MergedHit =
  | { kind: "person"; data: PersonSummary }
  | { kind: "company"; data: CompanySummary };

export function personSubtitle(p: PersonSummary): string {
  const parts: string[] = [];
  if (p.associatedCompanies.length > 0) {
    parts.push(
      p.associatedCompanies.slice(0, 3).join(", ") + (p.associatedCompanies.length > 3 ? "…" : ""),
    );
  }
  if (p.knownBuilding) parts.push(p.knownBuilding);
  return parts.join(" · ") || "Person";
}

export function companySubtitle(c: CompanySummary): string {
  const parts: string[] = [];
  if (c.country) parts.push(c.country);
  parts.push(`${c.creditCount} credit${c.creditCount === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

/** Stable cmdk `value` for a hit; unique across both tables. */
export function hitKey(hit: MergedHit): string {
  return `${hit.kind}-${hit.data.id}`;
}

/**
 * Row body for a picker hit — icon, name, Person/Company tag, subtitle.
 * Shared so the main results and the "listed as companies" fallback (ADR 0030)
 * cannot drift apart.
 */
export function CreditEntityHitRow({ hit }: { hit: MergedHit }) {
  const isPerson = hit.kind === "person";
  const subtitle = isPerson ? personSubtitle(hit.data) : companySubtitle(hit.data);
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        {isPerson ? (
          <User className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
        ) : (
          <Building2 className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
        )}
        <span className="font-medium truncate">{hit.data.name}</span>
        <span className="text-2xs text-text-secondary shrink-0 uppercase tracking-wide">
          {isPerson ? "Person" : "Company"}
        </span>
      </div>
      <span className="text-2xs text-text-secondary pl-6 line-clamp-2">{subtitle}</span>
    </div>
  );
}
