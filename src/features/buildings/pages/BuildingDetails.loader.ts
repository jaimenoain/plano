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
  // Only CDN-cache data requests (React Router client-side nav appends .data).
  // HTML document responses embed <script> chunk URLs — caching those causes
  // users to load stale JS after a new deploy. See AI_STATUS.md 2026-05-27.
  if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildingAny = building as any;
  const localityId: string | null = buildingAny.locality_id ?? null;
  const buildingId = building.id as string;

  // -------------------------------------------------------------------------
  // Run locality, hero-image pipeline, and credits in PARALLEL — they are
  // independent of each other and together were adding 200-400ms of serial wait.
  // -------------------------------------------------------------------------

  type ImageRow = {
    id: string;
    storage_path: string;
    width_px: number | null;
    height_px: number | null;
    likes_count: number | null;
    created_at: string | null;
  };

  const [localityResult, heroImagePipelineResult, buildingCredits] =
    await Promise.all([
      // 1. Locality lookup
      (async (): Promise<{ country_code: string; city_slug: string } | null> => {
        if (!localityId) return null;
        const { data: loc } = await supabase
          .from("localities")
          .select("country_code, city_slug")
          .eq("id", localityId)
          .maybeSingle();
        return loc ? { country_code: loc.country_code, city_slug: loc.city_slug } : null;
      })(),

      // 2. Hero image pipeline (building_posts → review_images → pick best).
      //    Since the 20270872 migration `review_images.review_id` points at
      //    `building_posts(id)`, not `user_buildings(id)`. Querying the old
      //    table here silently missed every photo on a new-style note.
      (async (): Promise<{ candidateRows: ImageRow[]; heroImageUrl: string | null }> => {
        const { data: postRows } = await supabase
          .from("building_posts")
          .select("id")
          .eq("building_id", buildingId);

        const reviewIds = (postRows ?? []).map((r) => r.id);
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

        // Fallback: community_preview_url
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

        return { candidateRows, heroImageUrl };
      })(),

      // 3. Building credits
      getBuildingCreditsWithClient(supabase, buildingId),
    ]);

  const locality = localityResult;
  const heroImageUrl = heroImagePipelineResult.heroImageUrl;

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

  // -------------------------------------------------------------------------
  // Locality consistency check (new /architecture/:cc/:city/:id/:slug routes)
  // -------------------------------------------------------------------------
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

  return data({ building, heroImageUrl, buildingCredits, locality }, { headers });
}
