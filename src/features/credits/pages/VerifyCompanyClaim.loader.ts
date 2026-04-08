import { data, redirect, type LoaderFunctionArgs } from "react-router";
import {
  isValidCompanyClaimTokenFormat,
  redeemCompanyClaimTokenWithClient,
  type RedeemCompanyClaimTokenError,
} from "@/features/credits/api/companies";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export type VerifyCompanyClaimLoaderData =
  | { outcome: "invalid_format" }
  | { outcome: "needs_auth"; returnPath: string }
  | { outcome: "error"; error: RedeemCompanyClaimTokenError };

export async function verifyCompanyClaimLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  headers.set("Cache-Control", "private, no-store");

  const raw = params.token?.trim() ?? "";
  if (!isValidCompanyClaimTokenFormat(raw)) {
    return data({ outcome: "invalid_format" } satisfies VerifyCompanyClaimLoaderData, { headers });
  }

  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = `/verify-company-claim/${raw}`;
    return data({ outcome: "needs_auth", returnPath } satisfies VerifyCompanyClaimLoaderData, { headers });
  }

  const result = await redeemCompanyClaimTokenWithClient(supabase, raw);

  if (result.ok) {
    throw redirect(`/company/${result.companySlug}?claimVerified=1`, { headers });
  }

  return data({ outcome: "error", error: result.error } satisfies VerifyCompanyClaimLoaderData, { headers });
}
