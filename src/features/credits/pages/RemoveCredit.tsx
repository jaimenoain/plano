import { Link, ScrollRestoration, useLoaderData, type MetaFunction } from "react-router";
import { Button } from "@/components/ui/button";
import type { RemoveCreditByTokenError } from "@/features/credits/api/credits";
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
    <div className="min-h-screen bg-surface-default text-text-primary">
      <ScrollRestoration />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 text-center">
        {d.outcome === "success" ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">
              Credit removed — thank you
            </h1>
            <p className="mb-6 text-sm text-text-secondary">
              Your credit has been removed from{" "}
              <span className="text-text-primary">{d.buildingName}</span> on Plano.
            </p>
            {d.buildingHref ? (
              <Button asChild variant="default" className="min-w-[200px]">
                <Link to={d.buildingHref}>View building</Link>
              </Button>
            ) : (
              <Button asChild variant="default" className="min-w-[200px]">
                <Link to="/">Back to Plano</Link>
              </Button>
            )}
          </>
        ) : d.outcome === "invalid_format" ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">Invalid link</h1>
            <p className="mb-6 text-sm text-text-secondary">
              Open the remove link from your email, or contact us if you need help.
            </p>
            <Button asChild variant="outline" className="min-w-[200px]">
              <a href={`mailto:${SUPPORT_MAIL}`}>Contact support</a>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-semibold text-text-primary">
              We could not remove the credit
            </h1>
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
