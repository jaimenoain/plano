import { describe, it, expect } from "vitest";
import { parseCollectionViewMode, resolveDefaultCollectionViewMode } from "./collectionViewMode";

describe("parseCollectionViewMode", () => {
  it("accepts 'map'", () => {
    expect(parseCollectionViewMode("map")).toBe("map");
  });

  it("accepts 'list'", () => {
    expect(parseCollectionViewMode("list")).toBe("list");
  });

  it("rejects null", () => {
    expect(parseCollectionViewMode(null)).toBeNull();
  });

  it("rejects empty string", () => {
    expect(parseCollectionViewMode("")).toBeNull();
  });

  it("rejects arbitrary junk", () => {
    expect(parseCollectionViewMode("grid")).toBeNull();
    expect(parseCollectionViewMode("MAP")).toBeNull();
    expect(parseCollectionViewMode("map ")).toBeNull();
  });
});

describe("resolveDefaultCollectionViewMode", () => {
  it("defaults to list on mobile", () => {
    expect(resolveDefaultCollectionViewMode(true)).toBe("list");
  });

  it("defaults to map on desktop", () => {
    expect(resolveDefaultCollectionViewMode(false)).toBe("map");
  });
});
