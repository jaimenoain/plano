import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getBuildingWithLocality } from "@/features/buildings/api/buildingsApi";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  const idSegment = params.id?.trim();
  if (!idSegment) throw new Response("Not Found", { status: 404 });

  const building = await getBuildingWithLocality(supabase, idSegment);
  if (!building) throw new Response("Not Found", { status: 404 });

  if (building.locality) {
    throw redirect(
      getBuildingLocalityUrl(
        building.locality.country_code,
        building.locality.city_slug,
        building.id,
        building.slug,
        building.short_id,
      ),
      301,
    );
  }

  // No locality — keep the old URL active until locality data is added.
  throw redirect(getBuildingUrl(building.id, building.slug, building.short_id ?? undefined), 301);
}

export default function BuildingRedirect() {
  return null;
}
