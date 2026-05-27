import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { getBuildingImageUrl } from "@/utils/image";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CollectionMapPageLoaderData = {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  isPublic: boolean;
};

export async function collectionMapPageLoader({
  request,
  params,
}: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  const usernameParam = params.username?.trim();
  const slug = params.slug?.trim();
  if (!usernameParam || !slug) {
    throw new Response("Not found", { status: 404 });
  }

  const isUuid = UUID_RE.test(usernameParam);

  let profileQuery = supabase.from("profiles").select("id, username");
  if (isUuid) {
    profileQuery = profileQuery.eq("id", usernameParam);
  } else {
    profileQuery = profileQuery.ilike("username", usernameParam);
  }

  const { data: profile, error: profileError } = await profileQuery.maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.id) {
    throw new Response("Not found", { status: 404 });
  }

  const { data: collectionRow, error: collectionError } = await supabase
    .from("collections")
    .select("id, name, slug, description, is_public")
    .eq("owner_id", profile.id)
    .eq("slug", slug)
    .maybeSingle();

  if (collectionError) throw collectionError;
  if (!collectionRow) {
    throw new Response("Not found", { status: 404 });
  }

  const displayUsername = profile.username?.trim() || usernameParam;
  const name = collectionRow.name?.trim() || "Collection";
  const title = `${name} by ${displayUsername} | Plano`;
  const description =
    typeof collectionRow.description === "string" &&
    collectionRow.description.trim().length > 0
      ? collectionRow.description.trim().slice(0, 160)
      : `Explore ${name} — a curated map on Plano.`;
  const canonical = `${SITE_URL}/${displayUsername}/map/${collectionRow.slug}`;

  let ogImage = `${SITE_URL}/cover.jpg`;

  const { data: firstItem } = await supabase
    .from("collection_items")
    .select(
      "building:buildings(hero_image_url, community_preview_url)",
    )
    .eq("collection_id", collectionRow.id)
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  const building = firstItem?.building as
    | { hero_image_url: string | null; community_preview_url: string | null }
    | null
    | undefined;

  if (building) {
    const resolved =
      getBuildingImageUrl(building.hero_image_url) ??
      getBuildingImageUrl(building.community_preview_url);
    if (resolved) {
      ogImage = resolved;
    }
  }

  if (!collectionRow.is_public) {
    headers.set("Cache-Control", "private, no-store");
  } else if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
  }

  return data(
    {
      title,
      description,
      canonical,
      ogImage,
      isPublic: collectionRow.is_public === true,
    } satisfies CollectionMapPageLoaderData,
    { headers },
  );
}
