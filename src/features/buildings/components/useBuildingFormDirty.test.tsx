// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useBuildingFormDirty, type BuildingFormDirtyFields } from "./useBuildingFormDirty";
import type { BuildingFormData } from "./BuildingForm";

// initialValues as the form receives them (numbers, nullables), and the "pristine" live
// field shape that fieldsFromInitialValues() would derive from them (strings). The two must
// compare equal → not dirty.
const initial: BuildingFormData = {
  name: "Casa Mila",
  alt_name: "La Pedrera",
  aliases: ["b", "a"],
  year_completed: 1912,
  century: 20,
  status: "existing",
  access_level: "public",
  access_logistics: "",
  access_cost: "",
  access_notes: "",
  architect_statement: "",
  size_category: "",
  size_sqm: null,
  height_m: null,
  storeys: 6,
  designCreditEntities: [
    { id: "p1", name: "Gaudi", kind: "person" },
    { id: "c1", name: "Studio", kind: "company" },
  ],
  functional_category_id: "cat1",
  functional_typology_ids: ["t2", "t1"],
  selected_attribute_ids: ["a2", "a1"],
};

const pristine: BuildingFormDirtyFields = {
  name: "Casa Mila",
  alt_name: "La Pedrera",
  aliases: ["b", "a"],
  year_completed: "1912",
  century_manual: "20",
  status: "existing",
  access_level: "public",
  access_logistics: "",
  access_cost: "",
  access_notes: "",
  architect_statement: "",
  size_category: "",
  size_sqm: "",
  height_m: "",
  storeys: "6",
  designCreditEntities: [
    { kind: "person", id: "p1" },
    { kind: "company", id: "c1" },
  ],
  functional_category_id: "cat1",
  functional_typology_ids: ["t2", "t1"],
  selected_attribute_ids: ["a2", "a1"],
};

describe("useBuildingFormDirty", () => {
  it("is not dirty when the live fields match the initial values", () => {
    const { result } = renderHook(() => useBuildingFormDirty(initial, pristine));
    expect(result.current).toBe(false);
  });

  it("ignores array ordering (order-insensitive signature)", () => {
    const reordered: BuildingFormDirtyFields = {
      ...pristine,
      aliases: ["a", "b"],
      functional_typology_ids: ["t1", "t2"],
      selected_attribute_ids: ["a1", "a2"],
      designCreditEntities: [
        { kind: "company", id: "c1" },
        { kind: "person", id: "p1" },
      ],
    };
    const { result } = renderHook(() => useBuildingFormDirty(initial, reordered));
    expect(result.current).toBe(false);
  });

  it("is dirty when a tracked field changes", () => {
    const changed: BuildingFormDirtyFields = { ...pristine, storeys: "7" };
    const { result } = renderHook(() => useBuildingFormDirty(initial, changed));
    expect(result.current).toBe(true);
  });

  it("emits the dirty state through onDirtyChange", () => {
    const onDirtyChange = vi.fn();
    renderHook(() =>
      useBuildingFormDirty(initial, { ...pristine, name: "Renamed" }, onDirtyChange),
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });
});
