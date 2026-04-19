import { describe, it, expect } from "vitest";
import { parseDuration, formatDuration } from "./duration";

describe("duration utils", () => {
  describe("parseDuration", () => {
    it("should parse pure numeric strings as minutes", () => {
      expect(parseDuration("45")).toBe(45);
      expect(parseDuration("0")).toBe(0);
      expect(parseDuration("120")).toBe(120);
    });

    it("should parse hour-only strings", () => {
      expect(parseDuration("1h")).toBe(60);
      expect(parseDuration("2 h")).toBe(120);
      expect(parseDuration("2H")).toBe(120);
    });

    it("should parse minute-only strings", () => {
      expect(parseDuration("30m")).toBe(30);
      expect(parseDuration("15min")).toBe(15);
      expect(parseDuration("45  m")).toBe(45);
    });

    it("should parse combined hour and minute strings", () => {
      expect(parseDuration("1h 30m")).toBe(90);
      expect(parseDuration("2h15min")).toBe(135);
      expect(parseDuration(" 1 h  20 m ")).toBe(80);
    });

    it("should be case insensitive and handle whitespace", () => {
      expect(parseDuration("  2H 10M  ")).toBe(130);
      expect(parseDuration("1h30MIN")).toBe(90);
    });

    it("should return null for invalid or empty inputs", () => {
      expect(parseDuration("")).toBe(null);
      expect(parseDuration("   ")).toBe(null);
      expect(parseDuration("abc")).toBe(null);
      expect(parseDuration("hours")).toBe(null);
    });

    it("should return null if result is 0 but not a pure number", () => {
      expect(parseDuration("0h")).toBe(null);
      expect(parseDuration("0m")).toBe(null);
      expect(parseDuration("0h 0m")).toBe(null);
    });
  });

  describe("formatDuration", () => {
    it("should format minutes correctly", () => {
      expect(formatDuration(30)).toBe("30min");
      expect(formatDuration(0)).toBe("0min");
      expect(formatDuration(59)).toBe("59min");
    });

    it("should format exact hours correctly", () => {
      expect(formatDuration(60)).toBe("1h");
      expect(formatDuration(120)).toBe("2h");
    });

    it("should format combined hours and minutes correctly", () => {
      expect(formatDuration(90)).toBe("1h 30min");
      expect(formatDuration(135)).toBe("2h 15min");
    });

    it("should return empty string for null, undefined, or NaN", () => {
      expect(formatDuration(null)).toBe("");
      expect(formatDuration(undefined)).toBe("");
      expect(formatDuration(NaN)).toBe("");
    });
  });
});
