/**
 * Merge safety: spot records that must never be merged again.
 *
 * A building merge soft-deletes the source and points `merged_into_id` at the
 * keeper. Merging such a record a second time — especially as the *target* —
 * leaves a component with no live survivor, which hides every member from
 * search (`search_buildings_v2` and `get_map_clusters_v3` both filter
 * `is_deleted`). That is exactly how "Farnsworth House" disappeared.
 *
 * `merge_buildings` now refuses these merges outright; this derives the same
 * verdict client-side so the UI can explain the problem before anyone clicks.
 */

import type { BuildingLinkInput } from "@/utils/url";

export type MergeBlockerReason = "deleted" | "merged";

/** Enough of the surviving building to build a link to it. */
export type MergeSurvivor = BuildingLinkInput;

export type MergeBlocker = {
  entityId: string;
  /** "target" is the record that would survive; "source" is the one absorbed. */
  role: "target" | "source";
  reason: MergeBlockerReason;
  /** The record this one was already merged into, when known. */
  survivorId: string | null;
};

export type MergeStateRow = {
  id: string;
  is_deleted?: boolean | null;
  merged_into_id?: string | null;
};

/**
 * Returns one blocker per record that is already deleted or already merged.
 * An empty array means the pair is safe to merge.
 *
 * `reason` prefers "merged" over "deleted": a row with a pointer tells us where
 * the content went, which is the more actionable message.
 */
export function deriveMergeBlockers(
  rows: MergeStateRow[],
  targetId: string | null,
): MergeBlocker[] {
  return rows
    .filter((row) => Boolean(row.is_deleted) || Boolean(row.merged_into_id))
    .map((row) => ({
      entityId: row.id,
      role: row.id === targetId ? ("target" as const) : ("source" as const),
      reason: row.merged_into_id ? ("merged" as const) : ("deleted" as const),
      survivorId: row.merged_into_id ?? null,
    }));
}

type SurvivorRow = {
  id: string;
  slug?: string | null;
  short_id?: number | null;
  locality?: { country_code?: string | null; city_slug?: string | null } | null;
};

/**
 * Keys survivor rows by id and flattens the embedded locality, so a caller can
 * hand each one straight to `resolveBuildingUrl`.
 */
export function mapSurvivorRows(
  rows: SurvivorRow[] | null | undefined,
): Record<string, MergeSurvivor> {
  return Object.fromEntries(
    (rows ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        slug: row.slug ?? null,
        short_id: row.short_id ?? null,
        locality_country_code: row.locality?.country_code ?? null,
        locality_city_slug: row.locality?.city_slug ?? null,
      },
    ]),
  );
}
