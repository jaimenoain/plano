import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function profileLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  if (!params.username) {
    // /profile with no username requires auth — no SSR needed
    return data({ profile: null }, { headers });
  }

  const supabase = createSupabaseServerClient(request, headers);
  headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300",
  );
  const usernameParam = params.username;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      usernameParam,
    );

  let query = supabase
    .from("profiles")
    .select("id, username, avatar_url, bio");

  if (isUuid) {
    query = query.eq("id", usernameParam);
  } else {
    query = query.ilike("username", usernameParam);
  }

  const { data: profile } = await query.maybeSingle();

  if (!profile) {
    throw new Response("Not found", { status: 404 });
  }

  return data({ profile }, { headers });
}

