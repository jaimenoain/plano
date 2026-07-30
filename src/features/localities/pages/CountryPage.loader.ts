import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { SITE_URL, countryPageStructuredData } from "@/features/buildings/utils/structuredData";
import { getCountryGuide, type CountryGuide } from "@/features/localities/api/countryGuideApi";
import { getCountryUrl } from "@/utils/url";
import { getBuildingImageUrl } from "@/utils/image";

export type CountryPageLoaderData = {
  guide: CountryGuide;
  countryName: string;
  countryCode: string;
  totalBuildings: number;
  canonical: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  structuredData: Record<string, unknown>;
};

export async function countryPageLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  }

  const cc = params.cc?.trim().toUpperCase();
  if (!cc) throw new Response("Not found", { status: 404 });

  // One RPC carries the whole guide: counts, cities, essential buildings, the
  // era spread, practices, contributors and collections.
  const guide = await getCountryGuide(supabase, cc);

  // No localities for this code means no country page — same 404 as before.
  if (!guide || guide.cities.length === 0) throw new Response("Not found", { status: 404 });

  const countryName = guide.country.name ?? cc;
  const totalBuildings = guide.country.buildings;
  const canonical = `${SITE_URL}${getCountryUrl(cc)}`;

  const metaTitle = `Architecture in ${countryName} — ${totalBuildings.toLocaleString("en")} Buildings on Plano`;
  const metaDescription = `Where to go, what to see and who to ask: ${totalBuildings.toLocaleString(
    "en",
  )} buildings across ${guide.country.cities.toLocaleString(
    "en",
  )} towns and cities in ${countryName}, cataloged by the Plano community.`;

  // The share image is the photograph the page itself leads with.
  const ogImage =
    getBuildingImageUrl(guide.essentials.find((b) => b.image_url)?.image_url ?? null) ??
    `${SITE_URL}/cover.jpg`;

  const body: CountryPageLoaderData = {
    guide,
    countryName,
    countryCode: cc,
    totalBuildings,
    canonical,
    metaTitle,
    metaDescription,
    ogImage,
    structuredData: countryPageStructuredData(
      cc,
      countryName,
      guide.cities.map((c) => ({ city: c.city, country_code: cc, city_slug: c.city_slug })),
      canonical,
    ) as Record<string, unknown>,
  };

  return data(body, { headers });
}
