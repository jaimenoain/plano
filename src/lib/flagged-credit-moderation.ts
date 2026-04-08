import type { PersonClaimStatus } from "@/features/credits/types";

/** Policy-aligned window for informational auto-hide countdown on the admin queue (not enforced by cron in Task 8.1). */
export const FLAGGED_AUTO_HIDE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isVerifiedFlaggedCredit(flaggedFromStatus: string | null | undefined): boolean {
  return flaggedFromStatus === "verified";
}

/**
 * Countdown applies only when the credit was flagged from `active`, every linked entity is still
 * `unclaimed`, and the row is not a verified→flagged case.
 */
export function shouldShowAutoHideCountdown(
  flaggedFromStatus: string | null | undefined,
  person: { id: string; claimStatus: PersonClaimStatus } | null,
  company: { id: string; claimStatus: PersonClaimStatus } | null,
): boolean {
  if (isVerifiedFlaggedCredit(flaggedFromStatus)) return false;
  const personUnclaimed = !person || person.claimStatus === "unclaimed";
  const companyUnclaimed = !company || company.claimStatus === "unclaimed";
  return personUnclaimed && companyUnclaimed;
}

export function autoHideDeadlineMs(flaggedAt: string | null | undefined): number | null {
  if (!flaggedAt) return null;
  const t = Date.parse(flaggedAt);
  if (Number.isNaN(t)) return null;
  return t + FLAGGED_AUTO_HIDE_DAYS * MS_PER_DAY;
}

/** Human-readable remaining time until the informational auto-hide deadline; empty if unknown or past. */
export function formatAutoHideCountdown(flaggedAt: string | null | undefined, nowMs: number): string {
  const end = autoHideDeadlineMs(flaggedAt);
  if (end === null) return "";
  const remaining = end - nowMs;
  if (remaining <= 0) return "Past auto-hide window";
  const days = Math.floor(remaining / MS_PER_DAY);
  const hours = Math.floor((remaining % MS_PER_DAY) / (60 * 60 * 1000));
  if (days >= 1) return `${days}d ${hours}h left`;
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
