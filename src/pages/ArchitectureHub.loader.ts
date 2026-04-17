import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { SITE_URL } from "@/features/buildings/utils/structuredData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CountryEntry {
  countryCode: string;   // lowercase ISO 3166-1 alpha-2
  countryName: string;
  buildingsCount: number;
  topCity: string;
  topCitySlug: string;
  heroImageUrl: string | null;
}

export interface TopCity {
  countryCode: string;   // lowercase
  cityName: string;
  citySlug: string;
  buildingsCount: number;
  countryName: string;
}

export interface ArchitectureHubLoaderData {
  countries: CountryEntry[];
  topCities: TopCity[];
  totalBuildings: number;
  totalCountries: number;
  breadcrumbStructuredData: Record<string, unknown>;
  itemListStructuredData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function architectureHubLoader({ request }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  let localities: {
    country_code: string;
    country: string;
    city: string;
    city_slug: string;
    buildings_count: number;
    hero_image_url: string | null;
  }[] = [];
  let totalBuildings = 0;

  try {
    const [localitiesResult, buildingsCountResult] = await Promise.all([
      supabase
        .from("localities")
        .select("country_code, country, city, city_slug, buildings_count, hero_image_url")
        .order("buildings_count", { ascending: false }),
      supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false),
    ]);

    localities = localitiesResult.data ?? [];
    totalBuildings = buildingsCountResult.count ?? 0;
  } catch (e) {
    // swallow — return empty data rather than crashing the page
    void e;
  }

  // Aggregate to country level.
  // Localities are sorted desc by buildings_count so the first entry per country
  // is already the top city — no extra comparison needed.
  const countryMap = new Map<string, CountryEntry>();
  for (const loc of localities) {
    const cc = loc.country_code.toLowerCase();
    const existing = countryMap.get(cc);
    if (!existing) {
      countryMap.set(cc, {
        countryCode: cc,
        countryName: loc.country,
        buildingsCount: loc.buildings_count,
        topCity: loc.city,
        topCitySlug: loc.city_slug,
        heroImageUrl: loc.hero_image_url,
      });
    } else {
      existing.buildingsCount += loc.buildings_count;
      if (!existing.heroImageUrl && loc.hero_image_url) {
        existing.heroImageUrl = loc.hero_image_url;
      }
    }
  }

  const countries = Array.from(countryMap.values()).sort(
    (a, b) => b.buildingsCount - a.buildingsCount,
  );
  const totalCountries = countries.length;

  // Top 6 cities — localities already sorted desc
  const topCities: TopCity[] = localities.slice(0, 6).map((loc) => ({
    countryCode: loc.country_code.toLowerCase(),
    cityName: loc.city,
    citySlug: loc.city_slug,
    buildingsCount: loc.buildings_count,
    countryName: loc.country,
  }));

  const breadcrumbStructuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Architecture",
        item: `${SITE_URL}/architecture`,
      },
    ],
  };

  const itemListStructuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Architecture by Country",
    description: "Browse Plano's building catalogue by country",
    itemListElement: countries.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.countryName,
      url: `${SITE_URL}/architecture/${c.countryCode}`,
    })),
  };

  const body: ArchitectureHubLoaderData = {
    countries,
    topCities,
    totalBuildings,
    totalCountries,
    breadcrumbStructuredData,
    itemListStructuredData,
  };

  return data(body, { headers });
}
