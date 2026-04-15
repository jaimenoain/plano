import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getEventUrl } from "@/utils/url";

export async function eventDetailLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  const slug = params.slug!;
  // Present on the locality-scoped route (/events/:cc/:city/:slug); absent on /events/:slug.
  const cc = params.cc as string | undefined;
  const city = params.city as string | undefined;

  // Fetch minimal event data for locality consistency check.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase as any)
    .from("events")
    .select("slug, country_code, city_slug, is_deleted")
    .eq("slug", slug)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!row) {
    // Let the component render the not-found state.
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventRow = row as any;
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

  return {};
}
