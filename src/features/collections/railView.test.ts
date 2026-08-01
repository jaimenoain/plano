import { describe, expect, it } from "vitest";
import {
  hasNonCollectionLayer,
  resolveRailView,
  shouldShowRailToggle,
  showsCollection,
  showsDiscovery,
} from "./railView";

const ctx = (hasSavedPlacesLayer: boolean, hasDiscoveryLayer: boolean) => ({
  hasSavedPlacesLayer,
  hasDiscoveryLayer,
});

describe("hasNonCollectionLayer", () => {
  it("is true when either source is on", () => {
    expect(hasNonCollectionLayer(ctx(false, false))).toBe(false);
    expect(hasNonCollectionLayer(ctx(true, false))).toBe(true);
    expect(hasNonCollectionLayer(ctx(false, true))).toBe(true);
    expect(hasNonCollectionLayer(ctx(true, true))).toBe(true);
  });
});

describe("resolveRailView", () => {
  it("keeps the stored view while a source is on", () => {
    expect(resolveRailView("collection", ctx(true, true))).toBe("collection");
    expect(resolveRailView("discover", ctx(true, false))).toBe("discover");
    expect(resolveRailView("all", ctx(false, true))).toBe("all");
  });

  it("collapses to the collection when both sources go away underneath it", () => {
    expect(resolveRailView("discover", ctx(false, false))).toBe("collection");
    expect(resolveRailView("all", ctx(false, false))).toBe("collection");
  });

  it("leaves the stored value alone, so the view returns when a source comes back", () => {
    const stored = "discover" as const;
    expect(resolveRailView(stored, ctx(false, false))).toBe("collection");
    expect(resolveRailView(stored, ctx(false, true))).toBe("discover");
  });
});

describe("shouldShowRailToggle", () => {
  it("draws the toggle only when there is a second layer to choose", () => {
    expect(shouldShowRailToggle(ctx(false, false))).toBe(false);
    expect(shouldShowRailToggle(ctx(true, false))).toBe(true);
    expect(shouldShowRailToggle(ctx(false, true))).toBe(true);
  });
});

describe("what each view holds", () => {
  it("shows the collection on every view but Discover", () => {
    expect(showsCollection("collection")).toBe(true);
    expect(showsCollection("all")).toBe(true);
    expect(showsCollection("discover")).toBe(false);
  });

  it("shows non-collection buildings on every view but Collection", () => {
    expect(showsDiscovery("discover")).toBe(true);
    expect(showsDiscovery("all")).toBe(true);
    expect(showsDiscovery("collection")).toBe(false);
  });
});
