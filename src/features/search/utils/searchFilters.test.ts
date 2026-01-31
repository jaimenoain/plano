
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

  // Specific QA Verification Cases

  it("Case A: Exclusion Trumps Inclusion (Input Visited, Hide Visited -> Empty)", () => {
    // Simulate "Show Visited" chip active (Input list contains only visited items)
    const visitedOnlyBuildings = [
      { id: "4", status: "Built" }, // User status: visited
    ];
    const context: ClientFilterContext = {
      hideSaved: false,
      hideVisited: true, // Exclusion active
      userStatuses,
    };

    const result = applyClientFilters(visitedOnlyBuildings, context);
    expect(result.length).toBe(0);
  });

  it("Case B: Pure Discovery (Hide Visited + Hide Saved -> Only 'null' status)", () => {
    // Input list has mixed items
    const context: ClientFilterContext = {
      hideSaved: true,
      hideVisited: true,
      userStatuses,
    };
    const result = applyClientFilters(buildings, context);

    // Should NOT contain Saved (1) or Visited (4) or Ignored (5)
    expect(result.map(b => b.id)).not.toContain("1");
    expect(result.map(b => b.id)).not.toContain("4");
    expect(result.map(b => b.id)).not.toContain("5");

    // Should contain None (6)
    expect(result.map(b => b.id)).toContain("6");
  });

  it("Case C: Refined List (Input Saved, Hide Visited -> Show Saved)", () => {
    // Simulate "Show Saved" chip active (Input list contains only saved items)
    const savedOnlyBuildings = [
      { id: "1", status: "Built" }, // User status: pending (saved)
    ];
    const context: ClientFilterContext = {
      hideSaved: false,
      hideVisited: true, // Exclusion active for Visited
      userStatuses,
    };

    const result = applyClientFilters(savedOnlyBuildings, context);
    // Saved items should remain because they are NOT visited
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("1");
  });
});
