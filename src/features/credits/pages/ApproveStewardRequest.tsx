import { ScrollRestoration, useLoaderData, type MetaFunction } from "react-router";
import type { ApproveCompanyStewardRequestError } from "@/features/credits/api/companies";
import {
  TokenFlowHeadline,
  TokenFlowLayout,
  TokenFlowMessage,
  TokenFlowPrimaryLink,
  TokenFlowSecondaryLink,
} from "@/components/layout/TokenFlowLayout";
import {
  approveStewardRequestLoader,
  type ApproveStewardRequestLoaderData,
} from "./ApproveStewardRequest.loader";

export { approveStewardRequestLoader as loader } from "./ApproveStewardRequest.loader";

const SUPPORT_MAIL = "support@plano.app";

export const meta: MetaFunction<typeof approveStewardRequestLoader> = () => [
  { title: "Approve steward request | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

function errorMessage(code: ApproveCompanyStewardRequestError): string {
  switch (code) {
    case "expired":
      return "This link has expired. Ask the requester to send a new request from the company page.";
    case "already_used":
      return "This link was already used.";
    case "unknown_token":
      return "We could not find this link. It may be wrong or out of date.";
    case "invalid_token":
      return "This link does not look valid.";
    case "not_authenticated":
      return "Sign in with a company owner account to approve this request.";
    case "not_owner":
      return "Only a company owner can approve this request. Sign in with an owner account.";
    case "not_pending":
      return "This request is no longer pending.";
    default:
      return "Something went wrong. Please try again or contact us below.";
  }
}

export default function ApproveStewardRequest() {
  const d = useLoaderData() as ApproveStewardRequestLoaderData;

  return (
    <>
      <ScrollRestoration />
      <TokenFlowLayout>
        {d.outcome === "invalid_format" ? (
          <>
            <TokenFlowHeadline>Invalid link</TokenFlowHeadline>
            <TokenFlowMessage>
              Open the approval link from your email, or contact us if you need help.
            </TokenFlowMessage>
            <TokenFlowPrimaryLink href={`mailto:${SUPPORT_MAIL}`}>Contact support →</TokenFlowPrimaryLink>
          </>
        ) : d.outcome === "needs_auth" ? (
          <>
            <TokenFlowHeadline>Sign in to continue</TokenFlowHeadline>
            <TokenFlowMessage>
              Sign in with a Plano account that is an owner of this company, then open the link
              again.
            </TokenFlowMessage>
            <TokenFlowPrimaryLink to={`/login?redirect=${encodeURIComponent(d.returnPath)}`}>
              Log in →
            </TokenFlowPrimaryLink>
          </>
        ) : (
          <>
            <TokenFlowHeadline>Could not approve request</TokenFlowHeadline>
            <TokenFlowMessage>{errorMessage(d.error)}</TokenFlowMessage>
            <TokenFlowPrimaryLink href={`mailto:${SUPPORT_MAIL}`}>Contact support →</TokenFlowPrimaryLink>
            <TokenFlowSecondaryLink to="/">Home</TokenFlowSecondaryLink>
          </>
        )}
      </TokenFlowLayout>
    </>
  );
}
