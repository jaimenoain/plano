import { data, type LoaderFunctionArgs } from "react-router";
import {
  isValidRemovalTokenFormat,
  removeCreditByTokenWithClient,
  type RemoveCreditByTokenError,
} from "@/features/credits/api/credits";
import { getBuildingUrl } from "@/utils/url";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export type RemoveCreditLoaderData =
  | { outcome: "invalid_format" }
  | { outcome: "success"; buildingName: string; buildingHref: string | null }
  | { outcome: "error"; error: RemoveCreditByTokenError };

function buildingHrefFromRedeem(
  buildingId: string | undefined,
  buildingSlug: string | null | undefined,
  buildingShortId: number | null | undefined
): string | null {
  if (!buildingId) return null;
  return getBuildingUrl(buildingId, buildingSlug, buildingShortId);
}

export async function removeCreditLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  headers.set("Cache-Control", "private, no-store");

  const raw = params.token?.trim() ?? "";
  if (!isValidRemovalTokenFormat(raw)) {
    return data({ outcome: "invalid_format" } satisfies RemoveCreditLoaderData, { headers });
  }

  const supabase = createSupabaseServerClient(request, headers);
  const result = await removeCreditByTokenWithClient(supabase, raw);

  if (result.ok) {
    const buildingHref = buildingHrefFromRedeem(result.buildingId, result.buildingSlug, result.buildingShortId);
    const buildingName = result.buildingName?.trim() || "the building";
    return data(
      {
        outcome: "success",
        buildingName,
        buildingHref,
      } satisfies RemoveCreditLoaderData,
      { headers }
    );
  }

  return data(
    { outcome: "error", error: result.error } satisfies RemoveCreditLoaderData,
    { headers }
  );
}
