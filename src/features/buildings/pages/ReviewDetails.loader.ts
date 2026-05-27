import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getBuildingImageUrl } from "@/utils/image";
import { SITE_URL } from "@/features/buildings/utils/structuredData";

export async function reviewLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  }

  const id = params.id;
  if (!id) {
    throw new Response("Not found", { status: 404 });
  }

  const { data: row, error } = await supabase
    .from("building_posts")
    .select(
      `
      id,
      body,
      created_at,
      user:profiles!building_posts_user_id_fkey(username),
      building:buildings(id, name, short_id, slug, hero_image_url),
      images:review_images(id, storage_path)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Response("Not found", { status: 404 });
    }
    throw error;
  }

  if (!row) {
    throw new Response("Not found", { status: 404 });
  }

  const user = Array.isArray(row.user) ? row.user[0] : row.user;
  const building = Array.isArray(row.building) ? row.building[0] : row.building;

  if (!building) {
    throw new Response("Not found", { status: 404 });
  }

  const username = user?.username?.trim() || "Someone";
  const buildingName = building.name?.trim() || "a building";

  let firstImageUrl: string | null = null;
  for (const img of row.images ?? []) {
    const sp = (img as { storage_path: string }).storage_path;
    const url = getBuildingImageUrl(sp);
    if (url) {
      firstImageUrl = url;
      break;
    }
  }

  const mainFallback =
    building.hero_image_url != null
      ? getBuildingImageUrl(building.hero_image_url)
      : undefined;

  const ogImage = firstImageUrl ?? mainFallback ?? `${SITE_URL}/cover.jpg`;

  const content =
    typeof row.body === "string" && row.body.trim().length > 0
      ? row.body.trim()
      : null;
  const description =
    content ??
    `Check out ${user?.username ?? "Someone"}'s visit to ${buildingName}`;

  const canonical = `${SITE_URL}/review/${row.id}`;
  const contentLength = content?.length ?? 0;
  const imageCount = (row.images ?? []).length;
  const createdAt: string | null =
    typeof row.created_at === "string" ? row.created_at : null;

  return data(
    {
      reviewId: row.id,
      username,
      buildingName,
      description,
      ogImage,
      canonical,
      contentLength,
      imageCount,
      createdAt,
    },
    { headers },
  );
}
