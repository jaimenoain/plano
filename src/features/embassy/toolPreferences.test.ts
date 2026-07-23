import { describe, expect, it } from "vitest";
import { normalizeToolPreferences, TOOL_KEYS } from "./toolPreferences";

describe("normalizeToolPreferences", () => {
  it("returns an empty list for null/undefined/empty input", () => {
    expect(normalizeToolPreferences(null)).toEqual([]);
    expect(normalizeToolPreferences(undefined)).toEqual([]);
    expect(normalizeToolPreferences([])).toEqual([]);
  });

  it("keeps valid keys in their saved priority order", () => {
    expect(normalizeToolPreferences(["events", "research", "photography"])).toEqual([
      "events",
      "research",
      "photography",
    ]);
  });

  it("maps the legacy 'moderation' key to 'curation' in place", () => {
    expect(normalizeToolPreferences(["moderation", "outreach"])).toEqual([
      "curation",
      "outreach",
    ]);
  });

  it("drops unknown keys and dedupes after legacy mapping", () => {
    expect(
      normalizeToolPreferences(["curation", "moderation", "collections", "community"]),
    ).toEqual(["curation", "community"]);
  });

  it("accepts every canonical tool key", () => {
    expect(normalizeToolPreferences([...TOOL_KEYS])).toEqual([...TOOL_KEYS]);
  });
});
