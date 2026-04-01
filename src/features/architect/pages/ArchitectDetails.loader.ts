import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function architectLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  const { data: architect } = await supabase
    .from("architects")
    .select("id, name, type, nationality, bio")
    .eq("id", params.id!)
    .maybeSingle();

  if (!architect) throw new Response("Not found", { status: 404 });

  // Fetched here to support the existing redirect-to-profile logic
  const { data: linkedUser } = await supabase
    .from("profiles")
    .select("username")
    .eq("verified_architect_id", architect.id)
    .maybeSingle();

  return Response.json({ architect, linkedUser }, { headers });
}

