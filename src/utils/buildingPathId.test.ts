import { describe, it, expect } from "vitest";
import { classifyBuildingPathIdSegment } from "./buildingPathId";

describe("classifyBuildingPathIdSegment", () => {
  it("treats full UUID as uuid", () => {
    const id = "36f42efb-39e1-47f4-8f4d-faec09abc154";
    expect(classifyBuildingPathIdSegment(id)).toEqual({ kind: "uuid", value: id });
  });

  it("treats all-digit strings as shortId (not parseInt prefix)", () => {
    expect(classifyBuildingPathIdSegment("5536")).toEqual({ kind: "shortId", value: 5536 });
  });

  it("does not treat digit-prefixed junk as shortId", () => {
    expect(classifyBuildingPathIdSegment("5536asdfsadf")).toEqual({
      kind: "slug",
      value: "5536asdfsadf",
    });
  });

  it("treats slug-like segments as slug", () => {
    expect(classifyBuildingPathIdSegment("tour-eiffel")).toEqual({
      kind: "slug",
      value: "tour-eiffel",
    });
  });
});
