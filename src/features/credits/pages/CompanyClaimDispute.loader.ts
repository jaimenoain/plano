import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export type CompanyClaimDisputeLoaderData = {
  companyId: string;
  companyName: string;
  slug: string;
};

export async function companyClaimDisputeLoader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug?.trim() ?? "";
  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Cache-Control", "private, no-store");

  const supabase = createSupabaseServerClient(request, headers);

  const { data: row, error } = await supabase
    .from("companies")
    .select("id, name, claim_status")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!row?.id || !row.name) {
    throw new Response("Not Found", { status: 404 });
  }

  if (row.claim_status !== "claimed") {
    return redirect(`/company/${slug}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: st } = await supabase
      .from("company_stewards")
      .select("id")
      .eq("company_id", row.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (st) {
      return redirect(`/company/${slug}`);
    }
  }

  return data(
    {
      companyId: row.id,
      companyName: row.name,
      slug,
    } satisfies CompanyClaimDisputeLoaderData,
    { headers }
  );
}
