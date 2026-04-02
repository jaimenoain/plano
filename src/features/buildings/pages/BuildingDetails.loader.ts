import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { fetchBuildingDetails } from "@/utils/supabaseFallback";
import { getBuildingImageUrl } from "@/utils/image";

export async function buildingLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=3600",
  );
  let building: Awaited<ReturnType<typeof fetchBuildingDetails>>;
  try {
    building = await fetchBuildingDetails(params.id!, supabase);
  } catch (e) {
    if (e instanceof Error && e.message === "Building not found") {
      throw new Response("Not found", { status: 404 });
    }
    throw e;
  }

  let heroImageUrl: string | null = null;
  if (building.hero_image_id) {
    const { data: heroRow } = await supabase
      .from("review_images")
      .select("storage_path")
      .eq("id", building.hero_image_id)
      .single();
    if (heroRow) heroImageUrl = getBuildingImageUrl(heroRow.storage_path) ?? null;
  }

  return data({ building, heroImageUrl }, { headers });
}

