import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function profileLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  if (!params.username) {
    // /profile with no username requires auth — noindex for SSR; avoid caching shell
    headers.set("Cache-Control", "private, no-store");
    return data(
      { profile: null, styleBreakdown: [], noIndex: true as const },
      { headers },
    );
  }

  const supabase = createSupabaseServerClient(request, headers);
  if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  }
  const usernameParam = params.username;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      usernameParam,
    );

  let query = supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, firm, website");

  if (isUuid) {
    query = query.eq("id", usernameParam);
  } else {
    query = query.ilike("username", usernameParam);
  }

  const { data: profile } = await query.maybeSingle();

  if (!profile) {
    throw new Response("Not found", { status: 404 });
  }

  if (
    isUuid &&
    typeof profile.username === "string" &&
    profile.username.trim().length > 0
  ) {
    headers.set("Cache-Control", "no-store");
    throw redirect(`/profile/${profile.username.trim()}`, {
      status: 301,
      headers,
    });
  }

  return data({ profile, styleBreakdown: [] }, { headers });
}