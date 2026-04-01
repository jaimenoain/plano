import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function profileLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  if (!params.username) {
    // /profile with no username requires auth — no SSR needed
    return Response.json({ profile: null }, { headers });
  }

  const supabase = createSupabaseServerClient(request, headers);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .ilike("username", params.username)
    .maybeSingle();

  return Response.json({ profile }, { headers });
}

