import { Link, ScrollRestoration, useLoaderData, type MetaFunction } from "react-router";
import { Button } from "@/components/ui/button";
import type { ApproveCompanyStewardRequestError } from "@/features/credits/api/companies";
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
    <div className="min-h-screen bg-surface-default text-text-primary">
      <ScrollRestoration />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 text-center">
        {d.outcome === "invalid_format" ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">Invalid link</h1>
            <p className="mb-6 text-sm text-text-secondary">
              Open the approval link from your email, or contact us if you need help.
            </p>
            <Button asChild variant="outline" className="min-w-[200px]">
              <a href={`mailto:${SUPPORT_MAIL}`}>Contact support</a>
            </Button>
          </>
        ) : d.outcome === "needs_auth" ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">Sign in to continue</h1>
            <p className="mb-6 text-sm text-text-secondary">
              Sign in with a Plano account that is an <strong className="font-medium text-text-primary">owner</strong>{" "}
              of this company, then open the link again.
            </p>
            <Button asChild variant="default" className="min-w-[200px]">
              <Link to={`/auth?redirect=${encodeURIComponent(d.returnPath)}`}>Log in</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">Could not approve request</h1>
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
