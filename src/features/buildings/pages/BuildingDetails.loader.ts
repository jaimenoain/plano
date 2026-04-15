import { data, redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { fetchBuildingDetails } from "@/utils/supabaseFallback";
import { getBuildingCreditsWithClient } from "@/features/credits/api/credits";
import { getBuildingImageUrl } from "@/utils/image";
import {
  isBuildingHeroEligibleSize,
  pickFirstHeroEligibleStoragePath,
} from "@/lib/building-hero-image";
import { getBuildingLocalityUrl, getBuildingUrl } from "@/utils/url";

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

  const canonicalSlug =
    typeof building.slug === "string" && building.slug.length > 0
      ? building.slug
      : null;
  const canonicalShortId =
    typeof building.short_id === "number" ? building.short_id : null;

  // -------------------------------------------------------------------------
  // Locality consistency check (new /architecture/:cc/:city/:id/:slug routes)
  // -------------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildingAny = building as any;
  const localityId: string | null = buildingAny.locality_id ?? null;

  // Fetch locality data when we have a locality_id (one extra round-trip, cached at CDN level).
  let locality: { country_code: string; city_slug: string } | null = null;
  if (localityId) {
    const { data: loc } = await supabase
      .from("localities")
      .select("country_code, city_slug")
      .eq("id", localityId)
      .maybeSingle();
    if (loc) locality = loc;
  }

  // Helper: build the canonical URL for this building.
  function canonicalUrl(): string {
    const id = String(canonicalShortId ?? params.id);
    if (locality) {
      return getBuildingLocalityUrl(
        locality.country_code,
        locality.city_slug,
        id,
        canonicalSlug,
        canonicalShortId,
      );
    }
    return getBuildingUrl(id, canonicalSlug, canonicalShortId);
  }

  // If the route carries :cc and :city params, validate locality consistency.
  if (params.cc && params.city) {
    const ccMismatch =
      locality &&
      locality.country_code.toLowerCase() !== params.cc.toLowerCase();
    const cityMismatch =
      locality && locality.city_slug !== params.city;

    if (!locality) {
      // Building has no locality — redirect to legacy /building/ URL.
      throw redirect(getBuildingUrl(String(canonicalShortId ?? params.id), canonicalSlug, canonicalShortId), { status: 301, headers });
    }

    if (ccMismatch || cityMismatch) {
      throw redirect(canonicalUrl(), { status: 301, headers });
    }
  }

  // -------------------------------------------------------------------------
  // Slug / id canonicalization (same logic as before, updated redirect target)
  // -------------------------------------------------------------------------
  const idMismatch =
    canonicalShortId !== null &&
    String(params.id) !== String(canonicalShortId);
  const slugMissing = canonicalSlug !== null && !params.slug;
  const slugMismatch = canonicalSlug !== null && params.slug !== canonicalSlug;

  if (idMismatch || slugMissing || slugMismatch) {
    throw redirect(canonicalUrl(), { status: 301, headers });
  }

  const buildingId = building.id as string;

  const { data: reviewRows } = await supabase
    .from("user_buildings")
    .select("id")
    .eq("building_id", buildingId);

  const reviewIds = (reviewRows ?? []).map((r) => r.id);

  type ImageRow = {
    id: string;
    storage_path: string;
    width_px: number | null;
    height_px: number | null;
    likes_count: number | null;
    created_at: string | null;
  };

  let candidateRows: ImageRow[] = [];
  if (reviewIds.length > 0) {
    const { data: imgRows } = await supabase
      .from("review_images")
      .select("id, storage_path, width_px, height_px, likes_count, created_at")
      .in("review_id", reviewIds)
      .order("likes_count", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });
    candidateRows = (imgRows ?? []) as ImageRow[];
  }

  let heroImageUrl: string | null = null;

  if (building.hero_image_id) {
    let designated: Pick<
      ImageRow,
      "storage_path" | "width_px" | "height_px"
    > | null =
      candidateRows.find((r) => r.id === building.hero_image_id) ?? null;
    if (!designated) {
      const { data: heroOnly } = await supabase
        .from("review_images")
        .select("storage_path, width_px, height_px")
        .eq("id", building.hero_image_id)
        .maybeSingle();
      if (heroOnly) designated = heroOnly;
    }
    if (designated) {
      const w = designated.width_px;
      const h = designated.height_px;
      if (w != null && h != null) {
        if (isBuildingHeroEligibleSize(w, h)) {
          heroImageUrl = getBuildingImageUrl(designated.storage_path) ?? null;
        }
      } else {
        // Legacy rows without stored dimensions — keep explicit hero choice.
        heroImageUrl = getBuildingImageUrl(designated.storage_path) ?? null;
      }
    }
  }

  if (!heroImageUrl) {
    const pickedPath = pickFirstHeroEligibleStoragePath(candidateRows);
    if (pickedPath) {
      heroImageUrl = getBuildingImageUrl(pickedPath) ?? null;
    }
  }

  // Fallback: community_preview_url is a storage path — run it through getBuildingImageUrl.
  if (!heroImageUrl) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const communityPreview = (building as any).community_preview_url as
      | string
      | null
      | undefined;
    if (communityPreview) {
      heroImageUrl = communityPreview.startsWith("http")
        ? communityPreview
        : (getBuildingImageUrl(communityPreview) ?? null);
    }
  }

  const buildingCredits = await getBuildingCreditsWithClient(supabase, buildingId);

  return data({ building, heroImageUrl, buildingCredits, locality }, { headers });
}
