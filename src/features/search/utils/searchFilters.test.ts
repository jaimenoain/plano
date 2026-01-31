
import { describe, it, expect } from "bun:test";
import { applyClientFilters, ClientFilterContext } from "./searchFilters";

describe("applyClientFilters", () => {
  const buildings = [
    { id: "1", status: "Built" },
    { id: "2", status: "Demolished" },
    { id: "3", status: "Unbuilt" },
    { id: "4", status: "Built" },
    { id: "5", status: "Built" },
    { id: "6", status: "Built" },
  ];

  const userStatuses: Record<string, string> = {
    "1": "pending", // Saved
    "4": "visited", // Visited
    "5": "ignored", // Ignored
    "6": "none",    // No status
  };

  it("should filter out Demolished and Unbuilt buildings", () => {
    const context: ClientFilterContext = {
      hideSaved: false,
      hideVisited: false,
      userStatuses: {},
    };
    const result = applyClientFilters(buildings, context);
    expect(result.map(b => b.id)).not.toContain("2");
    expect(result.map(b => b.id)).not.toContain("3");
    expect(result.map(b => b.id)).toContain("1");
  });

  it("should filter out ignored buildings", () => {
    const context: ClientFilterContext = {
      hideSaved: false,
      hideVisited: false,
      userStatuses,
    };
    const result = applyClientFilters(buildings, context);
    expect(result.map(b => b.id)).not.toContain("5");
  });

  it("should hide Saved buildings when hideSaved is true", () => {
    const context: ClientFilterContext = {
      hideSaved: true,
      hideVisited: false,
      userStatuses,
    };
    const result = applyClientFilters(buildings, context);
    // 1 is pending (Saved), should be hidden
    expect(result.map(b => b.id)).not.toContain("1");
    // 4 is visited, should be present
    expect(result.map(b => b.id)).toContain("4");
  });

  it("should hide Visited buildings when hideVisited is true", () => {
    const context: ClientFilterContext = {
      hideSaved: false,
      hideVisited: true,
      userStatuses,
    };
    const result = applyClientFilters(buildings, context);
    // 4 is visited, should be hidden
    expect(result.map(b => b.id)).not.toContain("4");
    // 1 is pending, should be present
    expect(result.map(b => b.id)).toContain("1");
  });

  it("should hide both if both flags are true", () => {
    const context: ClientFilterContext = {
      hideSaved: true,
      hideVisited: true,
      userStatuses,
    };
    const result = applyClientFilters(buildings, context);
    expect(result.map(b => b.id)).not.toContain("1");
    expect(result.map(b => b.id)).not.toContain("4");
    expect(result.map(b => b.id)).toContain("6");
  });
});
