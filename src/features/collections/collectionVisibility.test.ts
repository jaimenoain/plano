import { describe, it, expect } from "vitest";
import { isVisibleCollectionItem, visibleCollectionItems } from "./collectionVisibility";
import { mapCollectionItem } from "./mapCollectionItem";
import type { CollectionItemWithBuilding } from "./types";

function item(
  id: string,
  is_hidden: boolean,
): CollectionItemWithBuilding {
  return {
    id,
    building_id: `b-${id}`,
    note: null,
    custom_category_id: null,
    is_hidden,
    building: {
      id: `b-${id}`,
      name: `Building ${id}`,
      location_lat: 0,
      location_lng: 0,
      city: null,
      country: null,
      location_precision: "exact",
      building_credits: [],
    },
  } as CollectionItemWithBuilding;
}

describe("collectionVisibility", () => {
  it("treats a hidden item as absent", () => {
    expect(isVisibleCollectionItem(item("a", true))).toBe(false);
    expect(isVisibleCollectionItem(item("a", false))).toBe(true);
  });

  it("drops hidden items and keeps the rest in order", () => {
    const items = [item("a", false), item("b", true), item("c", false)];
    expect(visibleCollectionItems(items).map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("tolerates a missing list", () => {
    expect(visibleCollectionItems(null)).toEqual([]);
    expect(visibleCollectionItems(undefined)).toEqual([]);
  });

  it("reads a row whose is_hidden column was not selected as visible, never undefined", () => {
    const mapped = mapCollectionItem({
      id: "x",
      building_id: "b",
      note: null,
      custom_category_id: null,
      building: { id: "b", name: "B", location: null },
    });
    expect(mapped?.is_hidden).toBe(false);
    expect(isVisibleCollectionItem(mapped!)).toBe(true);
  });

  it("keeps a hidden row hidden through the mapper", () => {
    const mapped = mapCollectionItem({
      id: "x",
      building_id: "b",
      note: null,
      custom_category_id: null,
      is_hidden: true,
      building: { id: "b", name: "B", location: null },
    });
    expect(isVisibleCollectionItem(mapped!)).toBe(false);
  });
});
