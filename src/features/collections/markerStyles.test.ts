import { describe, it, expect } from "vitest";
import {
  parseMarkerStyles,
  resolveMarkerStyle,
  resolveCollectionItemMarkerStyle,
  DEFAULT_MARKER_STYLES,
  DEFAULT_CUSTOM_MARKER_STYLE,
} from "./markerStyles";
import { MAP_MARKER_FILL } from "@/features/maps";

describe("parseMarkerStyles", () => {
  it("returns an empty map for null / undefined / non-object input", () => {
    expect(parseMarkerStyles(null)).toEqual({});
    expect(parseMarkerStyles(undefined)).toEqual({});
    expect(parseMarkerStyles("garbage")).toEqual({});
    expect(parseMarkerStyles(42)).toEqual({});
  });

  it("keeps a valid method/bucket entry", () => {
    const parsed = parseMarkerStyles({
      uniform: { all: { color: "#123ABC", size: "lg" } },
    });
    expect(parsed.uniform?.all).toEqual({ color: "#123abc", size: "lg" });
  });

  it("lowercases hex colours for stable comparisons", () => {
    const parsed = parseMarkerStyles({ uniform: { all: { color: "#ABCDEF", size: "sm" } } });
    expect(parsed.uniform?.all.color).toBe("#abcdef");
  });

  it("drops an entry with a malformed hex colour", () => {
    const parsed = parseMarkerStyles({
      uniform: { all: { color: "red", size: "lg" } },
    });
    expect(parsed.uniform).toBeUndefined();
  });

  it("drops an entry with an unknown size token", () => {
    const parsed = parseMarkerStyles({
      uniform: { all: { color: "#123456", size: "xl" } },
    });
    expect(parsed.uniform).toBeUndefined();
  });

  it("drops an unknown categorization method entirely", () => {
    const parsed = parseMarkerStyles({
      not_a_method: { all: { color: "#123456", size: "lg" } },
    });
    expect(parsed).toEqual({});
  });

  it("keeps only the valid entries within a partially-malformed bucket map", () => {
    const parsed = parseMarkerStyles({
      status: {
        all: { color: "#123456", size: "lg" },
        some: { color: "not-a-color", size: "lg" },
        none: { color: "#654321", size: "not-a-size" },
      },
    });
    expect(parsed.status).toEqual({ all: { color: "#123456", size: "lg" } });
  });

  it("accepts an arbitrary opaque hex — the whole point of ADR 0033", () => {
    const parsed = parseMarkerStyles({ custom: { "cat-1": { color: "#ff00aa", size: "md" } } });
    expect(parsed.custom?.["cat-1"]).toEqual({ color: "#ff00aa", size: "md" });
  });
});

describe("resolveMarkerStyle", () => {
  it("returns the pre-5.8 hardcoded default when no override is set", () => {
    expect(resolveMarkerStyle({}, "uniform", "all")).toEqual(DEFAULT_MARKER_STYLES.uniform.all);
    expect(resolveMarkerStyle({}, "status", "none")).toEqual(DEFAULT_MARKER_STYLES.status.none);
    expect(resolveMarkerStyle({}, "rating_member", "r3")).toEqual(DEFAULT_MARKER_STYLES.rating_member.r3);
  });

  it("returns the owner's override when set", () => {
    const styles = { uniform: { all: { color: "#00ff00", size: "sm" as const } } };
    expect(resolveMarkerStyle(styles, "uniform", "all")).toEqual({ color: "#00ff00", size: "sm" });
  });

  it("falls back to DEFAULT_CUSTOM_MARKER_STYLE for an unstyled custom category", () => {
    expect(resolveMarkerStyle({}, "custom", "cat-1")).toEqual(DEFAULT_CUSTOM_MARKER_STYLE);
  });

  it("every default entry reproduces the pre-5.8 hardcoded fill exactly", () => {
    expect(DEFAULT_MARKER_STYLES.uniform.all.color).toBe(MAP_MARKER_FILL.brandPrimary);
    expect(DEFAULT_MARKER_STYLES.status.all.color).toBe(MAP_MARKER_FILL.brandPrimary);
    expect(DEFAULT_MARKER_STYLES.status.some.color).toBe(MAP_MARKER_FILL.white);
    expect(DEFAULT_MARKER_STYLES.status.none.color).toBe(MAP_MARKER_FILL.surfaceMuted);
    expect(DEFAULT_MARKER_STYLES.rating_member.r3.color).toBe(MAP_MARKER_FILL.brandPrimary);
    expect(DEFAULT_MARKER_STYLES.rating_member.r2.color).toBe(MAP_MARKER_FILL.white);
    expect(DEFAULT_MARKER_STYLES.rating_member.other.color).toBe(MAP_MARKER_FILL.surfaceMuted);
    // Every default sits at the pixel size the colour-override branch has always
    // hardcoded (pinStyling.ts), so a null marker_styles renders byte-identical.
    for (const bucket of Object.values(DEFAULT_MARKER_STYLES)) {
      for (const style of Object.values(bucket)) {
        expect(style.size).toBe("lg");
      }
    }
  });
});

describe("resolveCollectionItemMarkerStyle", () => {
  const noStyles = {};

  it("uniform: always resolves to the single 'all' bucket", () => {
    const result = resolveCollectionItemMarkerStyle({
      method: "uniform",
      styles: noStyles,
      customCategoryId: null,
      stat: undefined,
      targetMemberCount: 0,
      personalStatus: null,
    });
    expect(result).toEqual({ color: MAP_MARKER_FILL.brandPrimary, size: "lg" });
  });

  it("custom: buckets by the item's custom_category_id", () => {
    const styles = { custom: { "cat-1": { color: "#00ff00", size: "sm" as const } } };
    const styled = resolveCollectionItemMarkerStyle({
      method: "custom",
      styles,
      customCategoryId: "cat-1",
      stat: undefined,
      targetMemberCount: 0,
      personalStatus: null,
    });
    expect(styled).toEqual({ color: "#00ff00", size: "sm" });

    const unstyled = resolveCollectionItemMarkerStyle({
      method: "custom",
      styles,
      customCategoryId: "cat-2",
      stat: undefined,
      targetMemberCount: 0,
      personalStatus: null,
    });
    expect(unstyled).toEqual(DEFAULT_CUSTOM_MARKER_STYLE);
  });

  it("status: buckets 'none' / 'some' / 'all' by visited count vs target", () => {
    const none = resolveCollectionItemMarkerStyle({
      method: "status",
      styles: noStyles,
      customCategoryId: null,
      stat: undefined,
      targetMemberCount: 3,
      personalStatus: null,
    });
    expect(none.color).toBe(MAP_MARKER_FILL.surfaceMuted);

    const some = resolveCollectionItemMarkerStyle({
      method: "status",
      styles: noStyles,
      customCategoryId: null,
      stat: { visitedCount: 1, maxRating: 0, hasSaved: true },
      targetMemberCount: 3,
      personalStatus: null,
    });
    expect(some.color).toBe(MAP_MARKER_FILL.white);

    const all = resolveCollectionItemMarkerStyle({
      method: "status",
      styles: noStyles,
      customCategoryId: null,
      stat: { visitedCount: 3, maxRating: 0, hasSaved: true },
      targetMemberCount: 3,
      personalStatus: null,
    });
    expect(all.color).toBe(MAP_MARKER_FILL.brandPrimary);
  });

  it("rating_member: buckets 'r3' / 'r2' / 'other' by max saved rating", () => {
    const r3 = resolveCollectionItemMarkerStyle({
      method: "rating_member",
      styles: noStyles,
      customCategoryId: null,
      stat: { visitedCount: 0, maxRating: 3, hasSaved: true },
      targetMemberCount: 1,
      personalStatus: null,
    });
    expect(r3.color).toBe(MAP_MARKER_FILL.brandPrimary);

    const r2 = resolveCollectionItemMarkerStyle({
      method: "rating_member",
      styles: noStyles,
      customCategoryId: null,
      stat: { visitedCount: 0, maxRating: 2, hasSaved: true },
      targetMemberCount: 1,
      personalStatus: null,
    });
    expect(r2.color).toBe(MAP_MARKER_FILL.white);

    const other = resolveCollectionItemMarkerStyle({
      method: "rating_member",
      styles: noStyles,
      customCategoryId: null,
      stat: undefined,
      targetMemberCount: 1,
      personalStatus: null,
    });
    expect(other.color).toBe(MAP_MARKER_FILL.surfaceMuted);
  });

  it("default (Personal Status): stays on the percentile ladder (color null) when the owner hasn't styled it", () => {
    const result = resolveCollectionItemMarkerStyle({
      method: "default",
      styles: noStyles,
      customCategoryId: null,
      stat: undefined,
      targetMemberCount: 0,
      personalStatus: "visited",
    });
    expect(result).toEqual({ color: null, size: null });
  });

  it("default (Personal Status): resolves once the owner sets an override, bucketed by personal status", () => {
    const styles = {
      default: {
        visited: { color: "#123456", size: "lg" as const },
        pending: { color: "#654321", size: "md" as const },
        unvisited: { color: "#abcdef", size: "sm" as const },
      },
    };
    expect(
      resolveCollectionItemMarkerStyle({
        method: "default",
        styles,
        customCategoryId: null,
        stat: undefined,
        targetMemberCount: 0,
        personalStatus: "visited",
      }),
    ).toEqual({ color: "#123456", size: "lg" });

    expect(
      resolveCollectionItemMarkerStyle({
        method: "default",
        styles,
        customCategoryId: null,
        stat: undefined,
        targetMemberCount: 0,
        personalStatus: null,
      }),
    ).toEqual({ color: "#abcdef", size: "sm" });
  });
});
