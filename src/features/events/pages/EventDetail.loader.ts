import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getEventUrl } from "@/utils/url";

interface EventConsistencyRow {
  slug: string;
  country_code: string | null;
  city_slug: string | null;
  is_deleted: boolean;
}

export async function eventDetailLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  // Public event content. Cache the data-only response at the CDN (gated to
  // `.data` so the HTML document is never CDN-cached — see the stale-content
  // post-mortem in docs/AI_STATUS.md). Mirrors the locality/company loaders.
  if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  }

  const slug = params.slug!;
  // Present on the locality-scoped route (/events/:cc/:city/:slug); absent on /events/:slug.
  const cc = params.cc as string | undefined;
  const city = params.city as string | undefined;

  // Fetch minimal event data for locality consistency check.
  const { data: row } = await supabase
    .from("events")
    .select("slug, country_code, city_slug, is_deleted")
    .eq("slug", slug)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!row) {
    // Let the component render the not-found state.
    return data({}, { headers });
  }

  const eventRow = row as EventConsistencyRow;
  const target = getEventUrl({
    slug: eventRow.slug,
    countryCode: eventRow.country_code ?? null,
    citySlug: eventRow.city_slug ?? null,
  });

  // /events/:slug for a physical event → redirect to locality-scoped URL.
  if (!cc && !city && eventRow.country_code && eventRow.city_slug) {
    throw redirect(target, 301);
  }

  // /events/:cc/:city/:slug with wrong locality params → redirect to correct URL.
  if (cc && city) {
    const expectedCc = (eventRow.country_code ?? "").toLowerCase();
    const expectedCity = eventRow.city_slug ?? "";
    if (cc.toLowerCase() !== expectedCc || city !== expectedCity) {
      throw redirect(target, 301);
    }
  }

  return data({}, { headers });
}
