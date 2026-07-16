import { describe, it, expect } from "vitest";
import { dateKey, pickBuildingOfTheDay } from "./buildingOfTheDay";

describe("dateKey", () => {
  it("formats a fixed date as YYYY-MM-DD", () => {
    expect(dateKey(new Date(2026, 6, 16, 10, 30))).toBe("2026-07-16");
  });

  it("zero-pads single-digit months and days", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("pickBuildingOfTheDay", () => {
  const pool = (n: number) => Array.from({ length: n }, (_, i) => `b${i}`);

  it("returns null for an empty pool", () => {
    expect(pickBuildingOfTheDay([], "2026-07-16")).toBeNull();
  });

  it("is deterministic — same key, same pick", () => {
    const rows = pool(24);
    const first = pickBuildingOfTheDay(rows, "2026-07-16");
    for (let i = 0; i < 5; i++) {
      expect(pickBuildingOfTheDay(rows, "2026-07-16")).toBe(first);
    }
  });

  it("always picks within bounds", () => {
    for (const n of [1, 2, 24]) {
      const rows = pool(n);
      for (let day = 1; day <= 28; day++) {
        const key = `2026-07-${String(day).padStart(2, "0")}`;
        const pick = pickBuildingOfTheDay(rows, key);
        expect(rows).toContain(pick);
      }
    }
  });

  it("rotates across dates", () => {
    const rows = pool(24);
    const picks = new Set(
      Array.from({ length: 28 }, (_, i) =>
        pickBuildingOfTheDay(rows, `2026-07-${String(i + 1).padStart(2, "0")}`),
      ),
    );
    // Not a strict uniformity claim — just that the hash actually varies.
    expect(picks.size).toBeGreaterThan(1);
  });
});
