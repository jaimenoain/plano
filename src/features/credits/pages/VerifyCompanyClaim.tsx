import { Link, ScrollRestoration, useLoaderData, type MetaFunction } from "react-router";
import { Button } from "@/components/ui/button";
import type { RedeemCompanyClaimTokenError } from "@/features/credits/api/companies";
import {
  verifyCompanyClaimLoader,
  type VerifyCompanyClaimLoaderData,
} from "./VerifyCompanyClaim.loader";

export { verifyCompanyClaimLoader as loader } from "./VerifyCompanyClaim.loader";

const SUPPORT_MAIL = "support@plano.app";

export const meta: MetaFunction<typeof verifyCompanyClaimLoader> = () => [
  { title: "Verify company claim | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

function errorMessage(code: RedeemCompanyClaimTokenError): string {
  switch (code) {
    case "expired":
      return "This link has expired. Start again from the company page.";
    case "already_used":
      return "This link was already used.";
    case "unknown_token":
      return "We could not find this link. It may be wrong or out of date.";
    case "invalid_token":
      return "This link does not look valid.";
    case "wrong_user":
      return "Sign in with the same Plano account you used when you requested verification.";
    case "not_claimable":
      return "This company can no longer be claimed this way. It may already have stewards.";
    case "not_authenticated":
      return "Sign in to finish claiming this company.";
    default:
      return "Something went wrong. Please try again or contact us below.";
  }
}

export default function VerifyCompanyClaim() {
  const d = useLoaderData() as VerifyCompanyClaimLoaderData;

  return (
    <div className="min-h-screen bg-surface-default text-text-primary">
      <ScrollRestoration />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 text-center">
        {d.outcome === "invalid_format" ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">Invalid link</h1>
            <p className="mb-6 text-sm text-text-secondary">
              Open the verification link from your email, or contact us if you need help.
            </p>
            <Button asChild variant="outline" className="min-w-[200px]">
              <a href={`mailto:${SUPPORT_MAIL}`}>Contact support</a>
            </Button>
          </>
        ) : d.outcome === "needs_auth" ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">Sign in to continue</h1>
            <p className="mb-6 text-sm text-text-secondary">
              Use the same Plano account you used when you entered your work email on the company page.
            </p>
            <Button asChild variant="default" className="min-w-[200px]">
              <Link to={`/auth?redirect=${encodeURIComponent(d.returnPath)}`}>Log in</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">We could not verify your claim</h1>
            <p className="mb-6 text-sm text-text-secondary">{errorMessage(d.error)}</p>
            <div className="flex flex-col items-center gap-3">
              <Button asChild variant="outline" className="min-w-[200px]">
                <a href={`mailto:${SUPPORT_MAIL}`}>Contact support</a>
              </Button>
              <Button asChild variant="ghost" className="text-text-secondary">
                <Link to="/">Home</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
