import { ScrollRestoration, useLoaderData, type MetaFunction } from "react-router";
import type { RemoveCreditByTokenError } from "@/features/credits/api/credits";
import {
  TokenFlowHeadline,
  TokenFlowLayout,
  TokenFlowMessage,
  TokenFlowPrimaryLink,
  TokenFlowSecondaryLink,
} from "@/components/layout/TokenFlowLayout";
import {
  removeCreditLoader,
  type RemoveCreditLoaderData,
} from "./RemoveCredit.loader";

export { removeCreditLoader as loader } from "./RemoveCredit.loader";

const SUPPORT_MAIL = "support@plano.app";

export const meta: MetaFunction<typeof removeCreditLoader> = () => [
  { title: "Remove credit | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

function errorMessage(code: RemoveCreditByTokenError): string {
  switch (code) {
    case "expired":
      return "This link has expired. If you still need help, contact us below.";
    case "already_used":
      return "This link was already used. The credit is no longer listed.";
    case "unknown_token":
      return "We could not find this link. It may be wrong or out of date.";
    case "invalid_token":
      return "This link does not look valid.";
    default:
      return "Something went wrong. Please try again or contact us below.";
  }
}

export default function RemoveCredit() {
  const d = useLoaderData() as RemoveCreditLoaderData;

  return (
    <>
      <ScrollRestoration />
      <TokenFlowLayout>
        {d.outcome === "success" ? (
          <>
            <TokenFlowHeadline>Credit removed</TokenFlowHeadline>
            <TokenFlowMessage>
              Your credit has been removed from{" "}
              <span className="text-text-primary">{d.buildingName}</span> on Plano. Thank you for
              letting us know.
            </TokenFlowMessage>
            <TokenFlowPrimaryLink to={d.buildingHref ?? "/"}>
              {d.buildingHref ? "View building →" : "Back to Plano →"}
            </TokenFlowPrimaryLink>
          </>
        ) : d.outcome === "invalid_format" ? (
          <>
            <TokenFlowHeadline>Invalid link</TokenFlowHeadline>
            <TokenFlowMessage>
              Open the remove link from your email, or contact us if you need help.
            </TokenFlowMessage>
            <TokenFlowPrimaryLink href={`mailto:${SUPPORT_MAIL}`}>Contact support →</TokenFlowPrimaryLink>
          </>
        ) : (
          <>
            <TokenFlowHeadline>We could not remove the credit</TokenFlowHeadline>
            <TokenFlowMessage>{errorMessage(d.error)}</TokenFlowMessage>
            <TokenFlowPrimaryLink href={`mailto:${SUPPORT_MAIL}`}>Contact support →</TokenFlowPrimaryLink>
            <TokenFlowSecondaryLink to="/">Home</TokenFlowSecondaryLink>
          </>
        )}
      </TokenFlowLayout>
    </>
  );
}
