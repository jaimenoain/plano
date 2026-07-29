import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import type { Company } from "../types";

interface CompanyAccessBannersProps {
  company: Company;
  slug: string;
  isAuthenticated: boolean;
  /** True when the viewer is not a steward of an already-claimed company. */
  showStewardRequest: boolean;
  /** Id of the viewer's pending steward request, if any. */
  pendingStewardRequestId: string | null | undefined;
  /** Id of the viewer's open claim dispute, if any. */
  openClaimDisputeId: string | null | undefined;
  onClaim: () => void;
  onRequestAccess: () => void;
}

/**
 * The two ownership banners above the tabs: claim an unclaimed company, or ask
 * for steward access on (and optionally dispute) a claimed one. Exactly one of
 * them shows — `claim_status` decides which.
 */
export function CompanyAccessBanners({
  company,
  slug,
  isAuthenticated,
  showStewardRequest,
  pendingStewardRequestId,
  openClaimDisputeId,
  onClaim,
  onRequestAccess,
}: CompanyAccessBannersProps) {
  if (company.claimStatus === "unclaimed") {
    return (
      <div className="rounded-none border border-border-default bg-surface-muted px-4 py-4 sm:px-5">
        <p className="mb-2 text-sm font-medium text-text-primary">
          This company hasn&apos;t been claimed yet
        </p>
        <p className="mb-3 text-sm text-text-secondary">
          If you represent this organization, verify a work email—we&apos;ll send a one-time link to finish
          claiming.
        </p>
        {isAuthenticated ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="text-xs font-medium uppercase tracking-widest"
            onClick={onClaim}
          >
            Claim this company
          </Button>
        ) : (
          <Link
            to={`/login?redirect=${encodeURIComponent(`/company/${slug}`)}`}
            className="inline-flex text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
          >
            Log in to claim →
          </Link>
        )}
      </div>
    );
  }

  if (!showStewardRequest) return null;

  return (
    <div className="rounded-sm border border-border-default bg-surface-muted px-4 py-4 sm:px-5">
      <p className="mb-2 text-sm font-medium text-text-primary">Manage this company on Plano</p>
      <p className="mb-3 text-sm text-text-secondary">
        This profile is already claimed. Request access if you should be able to edit details and invite
        stewards.
      </p>
      {pendingStewardRequestId ? (
        <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
          Request pending — owners have been notified by email.
        </p>
      ) : isAuthenticated ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          className="text-xs font-medium uppercase tracking-widest"
          onClick={onRequestAccess}
        >
          Request access to manage this company
        </Button>
      ) : (
        <Link
          to={`/login?redirect=${encodeURIComponent(`/company/${slug}`)}`}
          className="inline-flex text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
        >
          Log in to request access →
        </Link>
      )}
      {openClaimDisputeId ? (
        <p className="mt-4 border-t border-border-default pt-4 text-sm text-text-secondary">
          Dispute under review — we have received your report. Our team will follow up by email if needed.
        </p>
      ) : (
        <div className="mt-4 border-t border-border-default pt-4">
          {isAuthenticated ? (
            <Link
              to={`/company/${slug}/dispute`}
              className="inline-flex text-2xs font-medium uppercase tracking-widest text-text-primary hover:underline"
            >
              Dispute this claim
            </Link>
          ) : (
            <Link
              to={`/login?redirect=${encodeURIComponent(`/company/${slug}/dispute`)}`}
              className="inline-flex text-2xs font-medium uppercase tracking-widest text-text-primary hover:underline"
            >
              Log in to dispute this claim →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
