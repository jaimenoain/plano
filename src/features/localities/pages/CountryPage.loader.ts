import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { SITE_URL, countryPageStructuredData } from "@/features/buildings/utils/structuredData";
import { getCountryLocalities, getCountryStats } from "@/features/localities/api/localitiesApi";
import type { LocalityDTO } from "@/features/localities/types";
import { getCountryUrl } from "@/utils/url";

export type CountryPageLoaderData = {
  localities: LocalityDTO[];
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
  headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  const cc = params.cc?.trim().toUpperCase();
  if (!cc) throw new Response("Not found", { status: 404 });

  const [localities, stats] = await Promise.all([
    getCountryLocalities(supabase, cc),
    getCountryStats(supabase, cc),
  ]);

  if (localities.length === 0) throw new Response("Not found", { status: 404 });

  const { countryName, totalBuildings } = stats;
  const canonical = `${SITE_URL}${getCountryUrl(cc)}`;
  const metaTitle = `Architecture in ${countryName} — ${totalBuildings} Buildings on Plano`;
  const metaDescription = `Explore ${totalBuildings} buildings across ${localities.length} cities in ${countryName} on Plano — the world's architecture, cataloged.`;
  const heroImageUrl = localities.find((l) => l.hero_image_url)?.hero_image_url ?? null;
  const ogImage = heroImageUrl ?? `${SITE_URL}/cover.jpg`;

  const body: CountryPageLoaderData = {
    localities,
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
      localities,
      canonical,
    ) as Record<string, unknown>,
  };

  return data(body, { headers });
}
