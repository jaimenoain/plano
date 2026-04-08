import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export type CompanyClaimDisputeLoaderData = {
  companyName: string;
};

export async function companyClaimDisputeLoader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug?.trim() ?? "";
  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=60");

  const supabase = createSupabaseServerClient(request, headers);
  const { data: row, error } = await supabase
    .from("companies")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!row?.name) {
    throw new Response("Not Found", { status: 404 });
  }

  return data({ companyName: row.name as string } satisfies CompanyClaimDisputeLoaderData, { headers });
}
