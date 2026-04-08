import { data, type LoaderFunctionArgs } from "react-router";
import type { CompanyWithCredits } from "@/features/credits/types";
import { getCompanyWithClient } from "@/features/credits/api/companies";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { SITE_URL, companyPageStructuredData } from "@/features/buildings/utils/structuredData";
import { config } from "@/config";

export type CompanyDetailsLoaderData = CompanyWithCredits & {
  canonical: string;
  metaTitle: string;
  description: string;
  ogImage: string;
  structuredData: Record<string, unknown>;
};

function absoluteCompanyLogo(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (t.startsWith("http") || t.startsWith("blob:") || t.startsWith("data:")) return t;
  const base = config.storage.publicUrl.replace(/\/$/, "");
  if (!base) return null;
  const path = t.startsWith("/") ? t.slice(1) : t;
  return `${base}/${encodeURI(path)}`;
}

export async function companyDetailsLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  const slug = params.slug?.trim();
  if (!slug) throw new Response("Not found", { status: 404 });

  const payload = await getCompanyWithClient(supabase, slug);
  if (!payload) throw new Response("Not found", { status: 404 });

  const { company } = payload;
  const logoAbsoluteUrl = absoluteCompanyLogo(company.logoUrl);
  const canonical = `${SITE_URL}/company/${company.slug}`;
  const metaTitle = `${company.name} — architecture and engineering projects on Plano`;
  const description =
    company.bio?.trim().slice(0, 300) ||
    `Projects and credits for ${company.name} on Plano — the world's architecture, cataloged.`;
  const ogImage = logoAbsoluteUrl ?? `${SITE_URL}/cover.jpg`;

  const body: CompanyDetailsLoaderData = {
    ...payload,
    canonical,
    metaTitle,
    description,
    ogImage,
    structuredData: companyPageStructuredData({
      name: company.name,
      slug: company.slug,
      country: company.country,
      logoAbsoluteUrl,
      website: company.website,
    }),
  };

  return data(body, { headers });
}
