import { describe, it, expect } from "vitest";
import { formatTaskCount, formatWeeklyDigestSummary } from "./weeklyDigest";

describe("formatTaskCount", () => {
  it("pluralises", () => {
    expect(formatTaskCount({ total: 1 })).toBe("1 task");
    expect(formatTaskCount({ total: 12 })).toBe("12 tasks");
    expect(formatTaskCount({ total: 0 })).toBe("0 tasks");
  });

  /** `capped` means _digest_chapter_backlog hit its LIMIT, so the number is a floor. */
  it("marks a capped count with a trailing +", () => {
    expect(formatTaskCount({ total: 200, capped: true })).toBe("200+ tasks");
  });

  it("treats a missing payload as zero rather than NaN", () => {
    expect(formatTaskCount(undefined)).toBe("0 tasks");
    expect(formatTaskCount(null)).toBe("0 tasks");
    expect(formatTaskCount({})).toBe("0 tasks");
  });
});

describe("formatWeeklyDigestSummary", () => {
  const digest = {
    chapterName: "London",
    you: { total: 3 },
    chapter: { total: 9, activeMembers: 2 },
    tasks: { total: 12, capped: false },
  };

  it("summarises a productive week", () => {
    expect(formatWeeklyDigestSummary(digest)).toBe(
      "3 contributions from you in London this week · 9 from the chapter · 12 tasks waiting",
    );
  });

  it("singularises a single contribution", () => {
    expect(formatWeeklyDigestSummary({ ...digest, you: { total: 1 } })).toContain(
      "1 contribution from you",
    );
  });

  /** The modal recipient after the inactivity skip is someone with a zero week. */
  it("uses the zero-state wording when the ambassador logged nothing", () => {
    expect(formatWeeklyDigestSummary({ ...digest, you: { total: 0 } })).toContain(
      "You logged nothing in London this week",
    );
  });

  it("falls back to a generic chapter name when it is missing or blank", () => {
    expect(formatWeeklyDigestSummary({ ...digest, chapterName: undefined })).toContain(
      "in your chapter this week",
    );
    expect(formatWeeklyDigestSummary({ ...digest, chapterName: "   " })).toContain(
      "in your chapter this week",
    );
  });

  it("never renders undefined or NaN for a missing or partial payload", () => {
    for (const input of [undefined, null, {}, { you: {} }, { tasks: {} }]) {
      const summary = formatWeeklyDigestSummary(input);
      expect(summary).not.toContain("undefined");
      expect(summary).not.toContain("NaN");
      expect(summary.length).toBeGreaterThan(0);
    }
  });
});
