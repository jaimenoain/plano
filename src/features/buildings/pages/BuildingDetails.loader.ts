import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { fetchBuildingDetails } from "@/utils/supabaseFallback";
import { getBuildingImageUrl } from "@/utils/image";

export async function buildingLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const building = await fetchBuildingDetails(params.id!, supabase);
  if (!building) throw new Response("Not found", { status: 404 });

  let heroImageUrl: string | null = null;
  if (building.hero_image_id) {
    const { data } = await supabase
      .from("review_images")
      .select("storage_path")
      .eq("id", building.hero_image_id)
      .single();
    if (data) heroImageUrl = getBuildingImageUrl(data.storage_path) ?? null;
  }

  return Response.json({ building, heroImageUrl }, { headers });
}

