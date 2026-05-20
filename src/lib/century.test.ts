import { describe, it, expect } from "vitest";
import {
  CENTURY_BC_FILTER_VALUE,
  formatCenturyLabel,
  matchesCenturyFilter,
  parseCenturyIds,
} from "./century";

describe("formatCenturyLabel", () => {
  it("formats ordinal centuries", () => {
    expect(formatCenturyLabel(19)).toBe("19th century");
    expect(formatCenturyLabel(20)).toBe("20th century");
    expect(formatCenturyLabel(21)).toBe("21st century");
    expect(formatCenturyLabel(11)).toBe("11th century");
    expect(formatCenturyLabel(1)).toBe("1st century");
  });

  it("formats B.C. centuries", () => {
    expect(formatCenturyLabel(-1)).toBe("1st century B.C.");
    expect(formatCenturyLabel(-2)).toBe("2nd century B.C.");
  });
});

describe("parseCenturyIds", () => {
  it("parses valid ids and drops invalid", () => {
    expect(parseCenturyIds(["21", "1", "0", "x", "-1"])).toEqual([
      21, 1, CENTURY_BC_FILTER_VALUE,
    ]);
  });
});

describe("matchesCenturyFilter", () => {
  it("matches positive centuries and B.C. separately or together", () => {
    expect(matchesCenturyFilter(20, [20])).toBe(true);
    expect(matchesCenturyFilter(20, [19])).toBe(false);
    expect(matchesCenturyFilter(-1, [CENTURY_BC_FILTER_VALUE])).toBe(true);
    expect(matchesCenturyFilter(-1, [20])).toBe(false);
    expect(matchesCenturyFilter(-1, [20, CENTURY_BC_FILTER_VALUE])).toBe(true);
    expect(matchesCenturyFilter(null, [20])).toBe(false);
    expect(matchesCenturyFilter(20, [])).toBe(true);
  });
});
