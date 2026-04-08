import type { BuildingCreditWithEntities } from "@/features/credits/types";

const VISIBLE_PRIMARY_STATUSES = new Set(["active", "verified"]);

export function visiblePrimaryCredits(
  credits: BuildingCreditWithEntities[],
): BuildingCreditWithEntities[] {
  return credits.filter(
    (c) => c.creditTier === "primary" && VISIBLE_PRIMARY_STATUSES.has(c.status),
  );
}

/** Plain-text line for search / meta / attribution (no HTML). */
export function primaryCreditPlainLabel(credit: BuildingCreditWithEntities): string {
  const p = credit.person;
  const co = credit.company;
  if (p && co) return `${p.name} @ ${co.name}`;
  if (p) return p.name;
  if (co) return co.name;
  return "";
}

/** Lead line for architect statement: primary tier, prefer `isLead`, else first primary credit. */
export function leadAttributionFromCredits(
  credits: BuildingCreditWithEntities[],
): string | undefined {
  const primary = visiblePrimaryCredits(credits);
  if (primary.length === 0) return undefined;
  const lead = primary.find((c) => c.isLead) ?? primary[0];
  const label = primaryCreditPlainLabel(lead);
  return label.length > 0 ? label : undefined;
}
