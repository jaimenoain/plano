import type { TierRank } from "@/types/plano-map";

export type AccessLevel = "public" | "private" | "restricted" | "commercial";
export type AccessLogistics =
  | "walk-in"
  | "booking_required"
  | "tour_only"
  | "exterior_only";
export type AccessCost = "free" | "paid" | "customers_only";

/**
 * Baseline row shape for `public.buildings` used in admin UIs.
 * Generated `Database` types omit this table until `npm run gen-types` is refreshed.
 */
export type BuildingRow = {
  id: string;
  name: string;
  address?: string | null;
  location_precision?: string | null;
  slug?: string | null;
  short_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  city?: string | null;
  country?: string | null;
  location?: unknown;
  status?: string | null;
  year_completed?: number | null;
  access_level?: AccessLevel | null;
  access_logistics?: AccessLogistics | null;
  access_cost?: AccessCost | null;
  is_deleted?: boolean;
  is_verified?: boolean;
  hero_image_url?: string | null;
  community_preview_url?: string | null;
  popularity_score?: number | null;
  tier_rank?: TierRank | null;
};

/** Primary visible design credits (person or company summaries); optional on table list until embedded in select. */
export interface AdminBuilding extends BuildingRow {
  designCreditSummaries?: { id: string; name: string }[] | null;
}
