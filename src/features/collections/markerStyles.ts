/**
 * markerStyles.ts
 *
 * Owner-chosen marker colour + size per Categorization Method bucket (Task 5.8,
 * ADR 0033). Stored raw as `collections.marker_styles` (untyped jsonb — see
 * `Collection.marker_styles` in ./types) and never trusted: every read goes
 * through `parseMarkerStyles`, which whitelists keys and rejects anything that
 * isn't a 6-digit hex colour or a known size token, exactly the precedent the
 * rest of this feature's jsonb columns (`custom_categories`) never had.
 *
 * A missing or partial value must render EXACTLY as it did before this task —
 * that is what `DEFAULT_MARKER_STYLES` is for. A collection nobody has touched
 * the Markers tab on renders byte-identical to pre-5.8.
 */
import { MAP_MARKER_FILL } from "@/features/maps";
import type { Collection } from "./types";
import type { BuildingStat } from "./collectionTopRatings";

export type CategorizationMethod = Collection["categorization_method"];

/** Named size steps, not free pixels — keeps the picker on a small, deliberate ladder. */
export type MarkerSizeToken = "sm" | "md" | "lg";

/** `lg` (28px) matches the pixel size the colour-override pin branch has always
 *  hardcoded (`pinStyling.ts`), so every default entry below renders unchanged. */
export const MARKER_SIZE_PX: Record<MarkerSizeToken, number> = {
  sm: 20,
  md: 24,
  lg: 28,
};

export const MARKER_SIZE_TOKENS: MarkerSizeToken[] = ["sm", "md", "lg"];

export interface MarkerStyle {
  color: string;
  size: MarkerSizeToken;
}

/** One entry per bucket within a method — e.g. `{ visited: {...}, pending: {...} }`. */
export type MarkerStyleBucketMap = Record<string, MarkerStyle>;

export type MarkerStyleMap = Partial<Record<CategorizationMethod, MarkerStyleBucketMap>>;

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

/** The fixed (non-`custom`) bucket keys each method renders, in the order the
 *  Markers tab lists them. `custom` has no fixed buckets — one row per category. */
export const MARKER_STYLE_BUCKETS: Record<Exclude<CategorizationMethod, "custom">, string[]> = {
  uniform: ["all"],
  default: ["visited", "pending", "unvisited"],
  status: ["all", "some", "none"],
  rating_member: ["r3", "r2", "other"],
};

const BUCKET_LABELS: Record<string, string> = {
  all: "All",
  some: "Some members",
  none: "No members",
  visited: "Visited",
  pending: "Pending",
  unvisited: "Not saved",
  r3: "Masterpiece (●●●)",
  r2: "Excellent (●●)",
  other: "Good or unrated",
};

export function getBucketLabel(bucketKey: string): string {
  return BUCKET_LABELS[bucketKey] ?? bucketKey;
}

/** Reproduces the exact fills the pre-5.8 code hardcoded per method/bucket, so a
 *  null or partial `marker_styles` renders identically to before this task. */
export const DEFAULT_MARKER_STYLES: Record<Exclude<CategorizationMethod, "custom">, MarkerStyleBucketMap> = {
  uniform: {
    all: { color: MAP_MARKER_FILL.brandPrimary, size: "lg" },
  },
  default: {
    visited: { color: MAP_MARKER_FILL.brandPrimary, size: "lg" },
    pending: { color: MAP_MARKER_FILL.white, size: "lg" },
    unvisited: { color: MAP_MARKER_FILL.surfaceMuted, size: "lg" },
  },
  status: {
    all: { color: MAP_MARKER_FILL.brandPrimary, size: "lg" },
    some: { color: MAP_MARKER_FILL.white, size: "lg" },
    none: { color: MAP_MARKER_FILL.surfaceMuted, size: "lg" },
  },
  rating_member: {
    r3: { color: MAP_MARKER_FILL.brandPrimary, size: "lg" },
    r2: { color: MAP_MARKER_FILL.white, size: "lg" },
    other: { color: MAP_MARKER_FILL.surfaceMuted, size: "lg" },
  },
};

export const DEFAULT_CUSTOM_MARKER_STYLE: MarkerStyle = {
  color: MAP_MARKER_FILL.brandPrimary,
  size: "lg",
};

function isValidStyle(value: unknown): value is MarkerStyle {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.color === "string" &&
    HEX_COLOR_RE.test(v.color) &&
    typeof v.size === "string" &&
    (MARKER_SIZE_TOKENS as string[]).includes(v.size)
  );
}

/**
 * Whitelist-parse a raw `collections.marker_styles` jsonb value. Unknown methods,
 * unknown bucket keys longer than a sane bound, and any entry that isn't a valid
 * `{color, size}` pair are dropped rather than throwing — a malformed value
 * should degrade to "no override", never break the map.
 */
export function parseMarkerStyles(raw: unknown): MarkerStyleMap {
  const result: MarkerStyleMap = {};
  if (!raw || typeof raw !== "object") return result;

  const methods: CategorizationMethod[] = ["default", "custom", "status", "rating_member", "uniform"];
  for (const method of methods) {
    const bucketsRaw = (raw as Record<string, unknown>)[method];
    if (!bucketsRaw || typeof bucketsRaw !== "object") continue;

    const buckets: MarkerStyleBucketMap = {};
    for (const [key, value] of Object.entries(bucketsRaw as Record<string, unknown>)) {
      if (typeof key !== "string" || key.length === 0 || key.length > 100) continue;
      if (isValidStyle(value)) {
        buckets[key] = { color: value.color.toLowerCase(), size: value.size };
      }
    }
    if (Object.keys(buckets).length > 0) {
      result[method] = buckets;
    }
  }
  return result;
}

/**
 * Resolve the style a given bucket should render: the owner's override if one is
 * set, else the pre-5.8 default for that method/bucket, else (custom categories
 * only, no fixed default) `DEFAULT_CUSTOM_MARKER_STYLE`.
 */
export function resolveMarkerStyle(
  styles: MarkerStyleMap,
  method: CategorizationMethod,
  bucketKey: string,
): MarkerStyle {
  const override = styles[method]?.[bucketKey];
  if (override) return override;
  if (method === "custom") return DEFAULT_CUSTOM_MARKER_STYLE;
  return DEFAULT_MARKER_STYLES[method]?.[bucketKey] ?? DEFAULT_CUSTOM_MARKER_STYLE;
}

/**
 * The one call CollectionMapPage makes per collection item: resolve its bucket
 * for the active Categorization Method, then its {color, size}. Extracted so
 * that file (frozen at its size budget) stays a thin caller — the bucketing
 * rules below are the exact pre-5.8 logic per method, now feeding
 * `resolveMarkerStyle` instead of a hardcoded `MAP_MARKER_FILL` value.
 *
 * `default` (Personal Status) is the one method that must NOT resolve a colour
 * when the owner hasn't touched it — it stays on the percentile ladder
 * (`color: null`) unless `styles.default` has at least one override, so a
 * collection nobody has restyled renders byte-identical to before this task.
 */
export function resolveCollectionItemMarkerStyle(params: {
  method: CategorizationMethod;
  styles: MarkerStyleMap;
  customCategoryId: string | null;
  /** Present only when the method's stats query ran (`status` / `rating_member`). */
  stat: BuildingStat | undefined;
  targetMemberCount: number;
  personalStatus: string | null | undefined;
}): { color: string | null; size: MarkerSizeToken | null } {
  const { method, styles, customCategoryId, stat, targetMemberCount, personalStatus } = params;

  if (method === "custom") {
    return { ...resolveMarkerStyle(styles, "custom", customCategoryId ?? "uncategorized") };
  }
  if (method === "uniform") {
    return { ...resolveMarkerStyle(styles, "uniform", "all") };
  }
  if (method === "status") {
    const bucketKey = !stat || stat.visitedCount === 0
      ? "none"
      : stat.visitedCount >= targetMemberCount && targetMemberCount > 0
        ? "all"
        : "some";
    return { ...resolveMarkerStyle(styles, "status", bucketKey) };
  }
  if (method === "rating_member") {
    const bucketKey = stat?.hasSaved && stat.maxRating === 3
      ? "r3"
      : stat?.hasSaved && stat.maxRating === 2
        ? "r2"
        // 1 pt, saved-unrated and no-record all share the quietest bucket. Its
        // colour has to stay opaque — a translucent face lets the basemap
        // through and the pin stops being a pin.
        : "other";
    return { ...resolveMarkerStyle(styles, "rating_member", bucketKey) };
  }
  // method === 'default' (Personal Status)
  if (!styles.default) return { color: null, size: null };
  const bucketKey = personalStatus === "visited" ? "visited" : personalStatus === "pending" ? "pending" : "unvisited";
  return { ...resolveMarkerStyle(styles, "default", bucketKey) };
}
