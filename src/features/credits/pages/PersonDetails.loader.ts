import { data, type LoaderFunctionArgs } from "react-router";
import type { PersonWithCredits } from "@/features/credits/types";
import { getPersonWithClient } from "@/features/credits/api/people";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { SITE_URL, personPageStructuredData } from "@/features/buildings/utils/structuredData";
import { config } from "@/config";

export type PersonDetailsLoaderData = PersonWithCredits & {
  canonical: string;
  metaTitle: string;
  description: string;
  ogImage: string;
  structuredData: Record<string, unknown>;
};

function absolutePersonAvatar(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (t.startsWith("http") || t.startsWith("blob:") || t.startsWith("data:")) return t;
  const base = config.storage.publicUrl.replace(/\/$/, "");
  if (!base) return null;
  const path = t.startsWith("/") ? t.slice(1) : t;
  return `${base}/${encodeURI(path)}`;
}

export async function personDetailsLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");

  const slug = params.slug?.trim();
  if (!slug) throw new Response("Not found", { status: 404 });

  const payload = await getPersonWithClient(supabase, slug);
  if (!payload) throw new Response("Not found", { status: 404 });

  const { person } = payload;
  const imageAbsoluteUrl = absolutePersonAvatar(person.avatarUrl);
  const canonical = `${SITE_URL}/person/${person.slug}`;
  const metaTitle = `${person.name} — buildings, projects and credits on Plano`;
  const description =
    person.bio?.trim().slice(0, 300) ||
    `Credits and buildings for ${person.name} on Plano — the world's architecture, cataloged.`;
  const ogImage = imageAbsoluteUrl ?? `${SITE_URL}/cover.jpg`;

  const body: PersonDetailsLoaderData = {
    ...payload,
    canonical,
    metaTitle,
    description,
    ogImage,
    structuredData: personPageStructuredData({
      name: person.name,
      slug: person.slug,
      nationality: person.nationality,
      imageAbsoluteUrl,
    }),
  };

  return data(body, { headers });
}
