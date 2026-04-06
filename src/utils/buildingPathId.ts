const BUILDING_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Classifies the first `:id` segment of `/building/:id/...` URLs.
 * Uses the same rules as {@link fetchBuildingDetails}: UUID, all-digit short_id, or slug.
 * Important: do not use `parseInt(id, 10)` alone — `parseInt("5536x", 10)` is 5536.
 */
export type BuildingPathIdSegment =
  | { kind: "uuid"; value: string }
  | { kind: "shortId"; value: number }
  | { kind: "slug"; value: string };

export function classifyBuildingPathIdSegment(id: string): BuildingPathIdSegment {
  if (BUILDING_UUID_RE.test(id)) {
    return { kind: "uuid", value: id };
  }
  if (/^\d+$/.test(id)) {
    return { kind: "shortId", value: Number.parseInt(id, 10) };
  }
  return { kind: "slug", value: id };
}
