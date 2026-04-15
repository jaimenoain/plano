import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { SITE_URL, localityPageStructuredData } from "@/features/buildings/utils/structuredData";
import { getLocalityBySlug, getLocalityBuildings } from "@/features/localities/api/localitiesApi";
import type { LocalityDTO, LocalityBuildingDTO } from "@/features/localities/types";
import { config } from "@/config";

export type LocalityPageLoaderData = {
  locality: LocalityDTO;
  initialBuildings: LocalityBuildingDTO[];
  canonical: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  structuredData: Record<string, unknown>;
};

function absoluteHeroUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (t.startsWith("http") || t.startsWith("blob:") || t.startsWith("data:")) return t;
  const base = config.storage.publicUrl.replace(/\/$/, "");
  if (!base) return null;
  const path = t.startsWith("/") ? t.slice(1) : t;
  return `${base}/${encodeURI(path)}`;
}

export async function localityPageLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  const citySlug = params.citySlug?.trim();
  if (!citySlug) throw new Response("Not found", { status: 404 });

  const locality = await getLocalityBySlug(supabase, citySlug);
  if (!locality) throw new Response("Not found", { status: 404 });

  const initialBuildings = await getLocalityBuildings(supabase, locality.id, 0, 24);

  const canonical = `${SITE_URL}/city/${locality.slug}`;
  const metaTitle =
    locality.meta_title ??
    `${locality.city} Architecture — ${locality.buildings_count} Buildings on Plano`;
  const metaDescription =
    locality.meta_description ??
    locality.description ??
    `Discover ${locality.buildings_count} buildings in ${locality.city}, ${locality.country} on Plano — the world's architecture, cataloged.`;
  const heroAbsoluteUrl = absoluteHeroUrl(locality.hero_image_url);
  const ogImage = heroAbsoluteUrl ?? `${SITE_URL}/cover.jpg`;

  const body: LocalityPageLoaderData = {
    locality,
    initialBuildings,
    canonical,
    metaTitle,
    metaDescription,
    ogImage,
    structuredData: localityPageStructuredData(locality, initialBuildings) as Record<
      string,
      unknown
    >,
  };

  return data(body, { headers });
}
