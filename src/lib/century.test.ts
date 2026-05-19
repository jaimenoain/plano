import { describe, it, expect } from "vitest";
import { formatCenturyLabel, parseCenturyIds } from "./century";

describe("formatCenturyLabel", () => {
  it("formats ordinal centuries", () => {
    expect(formatCenturyLabel(19)).toBe("19th century");
    expect(formatCenturyLabel(20)).toBe("20th century");
    expect(formatCenturyLabel(21)).toBe("21st century");
    expect(formatCenturyLabel(11)).toBe("11th century");
  });
});

describe("parseCenturyIds", () => {
  it("parses valid ids and drops invalid", () => {
    expect(parseCenturyIds(["19", "20", "x", "0"])).toEqual([19, 20]);
  });
});
