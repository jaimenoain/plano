import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getLocalityBySlug } from "@/features/localities/api/localitiesApi";
import { getLocalityUrl } from "@/utils/url";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  const slug = params.slug?.trim();
  if (!slug) throw new Response("Not Found", { status: 404 });

  const locality = await getLocalityBySlug(supabase, slug);
  if (!locality) throw new Response("Not Found", { status: 404 });

  throw redirect(getLocalityUrl(locality.country_code, locality.city_slug), 301);
}
