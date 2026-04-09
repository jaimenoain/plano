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

  // Fetch top 5 architectural styles for this user's visited buildings.
  // Joins user_buildings → building_styles → styles, grouped by style name.
  // NOTE: This requires a `building_styles` junction table and a `styles` table.
  // If those don't exist in your schema, remove this query and the styleBreakdown
  // return value — Profile.tsx does not depend on it for rendering.
  let styleBreakdown: { name: string; count: number }[] = [];
  try {
    const { data: stylesData } = await supabase
      .from("building_styles")
      .select("style:styles(name), building:user_buildings!inner(user_id, status)")
      .eq("building.user_id", profile.id)
      .eq("building.status", "visited");

    if (stylesData) {
      const counts = new Map<string, number>();
      for (const row of stylesData) {
        const style = row.style as { name?: string | null } | { name?: string | null }[] | null;
        const styleObj = Array.isArray(style) ? style[0] : style;
        const name = styleObj?.name ?? undefined;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
      styleBreakdown = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    }
  } catch (_e) {
    // Style breakdown is non-critical — silently skip if schema doesn't match
  }

  return data({ profile, styleBreakdown }, { headers });
}