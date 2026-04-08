import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function architectLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set(
    "Cache-Control",
    "public, s-maxage=600, stale-while-revalidate=86400",
  );

  const { data: architect, error: architectError } = await supabase
    .from("architects")
    .select("id, name, type, bio, website_url, headquarters")
    .eq("id", params.id!)
    .maybeSingle();

  if (architectError) throw architectError;
  if (!architect) throw new Response("Not found", { status: 404 });

  return data({ architect }, { headers });
}