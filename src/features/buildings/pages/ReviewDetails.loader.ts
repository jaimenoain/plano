import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getBuildingImageUrl } from "@/utils/image";
import { SITE_URL } from "@/features/buildings/utils/structuredData";

export async function reviewLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=3600",
  );

  const id = params.id;
  if (!id) {
    throw new Response("Not found", { status: 404 });
  }

  const { data: row, error } = await supabase
    .from("user_buildings")
    .select(
      `
      id,
      content,
      user:profiles(username),
      building:buildings(id, name, short_id, slug, main_image_url),
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
    building.main_image_url != null
      ? getBuildingImageUrl(building.main_image_url)
      : undefined;

  const ogImage = firstImageUrl ?? mainFallback ?? `${SITE_URL}/cover.jpg`;

  const content =
    typeof row.content === "string" && row.content.trim().length > 0
      ? row.content.trim()
      : null;
  const description =
    content ??
    `Check out ${user?.username ?? "Someone"}'s visit to ${buildingName}`;

  const canonical = `${SITE_URL}/review/${row.id}`;

  return data(
    {
      reviewId: row.id,
      username,
      buildingName,
      description,
      ogImage,
      canonical,
    },
    { headers },
  );
}
