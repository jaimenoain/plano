import { ScrollRestoration, useLoaderData, type MetaFunction } from "react-router";
import type { RedeemCompanyClaimTokenError } from "@/features/credits/api/companies";
import {
  TokenFlowHeadline,
  TokenFlowLayout,
  TokenFlowMessage,
  TokenFlowPrimaryLink,
  TokenFlowSecondaryLink,
} from "@/components/layout/TokenFlowLayout";
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
    <>
      <ScrollRestoration />
      <TokenFlowLayout>
        {d.outcome === "invalid_format" ? (
          <>
            <TokenFlowHeadline>Invalid link</TokenFlowHeadline>
            <TokenFlowMessage>
              Open the verification link from your email, or contact us if you need help.
            </TokenFlowMessage>
            <TokenFlowPrimaryLink href={`mailto:${SUPPORT_MAIL}`}>Contact support →</TokenFlowPrimaryLink>
          </>
        ) : d.outcome === "needs_auth" ? (
          <>
            <TokenFlowHeadline>Sign in to continue</TokenFlowHeadline>
            <TokenFlowMessage>
              Use the same Plano account you used when you entered your work email on the company
              page.
            </TokenFlowMessage>
            <TokenFlowPrimaryLink to={`/login?redirect=${encodeURIComponent(d.returnPath)}`}>
              Log in →
            </TokenFlowPrimaryLink>
          </>
        ) : (
          <>
            <TokenFlowHeadline>We could not verify your claim</TokenFlowHeadline>
            <TokenFlowMessage>{errorMessage(d.error)}</TokenFlowMessage>
            <TokenFlowPrimaryLink href={`mailto:${SUPPORT_MAIL}`}>Contact support →</TokenFlowPrimaryLink>
            <TokenFlowSecondaryLink to="/">Home</TokenFlowSecondaryLink>
          </>
        )}
      </TokenFlowLayout>
    </>
  );
}
