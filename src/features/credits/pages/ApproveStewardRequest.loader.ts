import { data, redirect, type LoaderFunctionArgs } from "react-router";
import {
  approveCompanyStewardRequestWithClient,
  isValidCompanyClaimTokenFormat,
  notifyStewardRequestApprovedWithClient,
  type ApproveCompanyStewardRequestError,
} from "@/features/credits/api/companies";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export type ApproveStewardRequestLoaderData =
  | { outcome: "invalid_format" }
  | { outcome: "needs_auth"; returnPath: string }
  | { outcome: "error"; error: ApproveCompanyStewardRequestError };

export async function approveStewardRequestLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  headers.set("Cache-Control", "private, no-store");

  const raw = params.token?.trim() ?? "";
  if (!isValidCompanyClaimTokenFormat(raw)) {
    return data({ outcome: "invalid_format" } satisfies ApproveStewardRequestLoaderData, { headers });
  }

  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = `/approve-steward-request/${raw}`;
    return data({ outcome: "needs_auth", returnPath } satisfies ApproveStewardRequestLoaderData, { headers });
  }

  const parsed = await approveCompanyStewardRequestWithClient(supabase, raw);

  if (!parsed.ok) {
    return data({ outcome: "error", error: parsed.error } satisfies ApproveStewardRequestLoaderData, { headers });
  }

  await notifyStewardRequestApprovedWithClient(supabase, parsed.requestId);

  throw redirect(`/company/${parsed.companySlug}?stewardApproved=1`, { headers });
}
