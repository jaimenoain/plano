import { describe, it, expect } from "vitest";
import {
  chapterName,
  digestPreviewLine,
  digestRows,
  digestSubject,
  formatTasksLabel,
  formatWeekLabel,
  taskRows,
} from "../../supabase/functions/_shared/weeklyDigestCopy";

describe("digestRows", () => {
  it("keeps only non-zero metrics, in display order", () => {
    expect(digestRows({ photos: 2, edits: 5, visits: 0, outreach: 1 })).toEqual([
      { label: "Edits made", count: 5 },
      { label: "Photos added", count: 2 },
      { label: "Firms reached out to", count: 1 },
    ]);
  });

  it("returns nothing for an empty or missing payload", () => {
    expect(digestRows({})).toEqual([]);
    expect(digestRows(undefined)).toEqual([]);
    expect(digestRows(null)).toEqual([]);
  });

  it("ignores the chapter-only activeMembers key and the running total", () => {
    const labels = digestRows({ total: 7, activeMembers: 3, edits: 7 }).map((r) => r.label);
    expect(labels).toEqual(["Edits made"]);
  });
});

describe("taskRows", () => {
  it("keeps only non-zero queues", () => {
    expect(taskRows({ photography: 53, outreach: 200, curation: 0, events: 18 })).toEqual([
      { label: "Buildings missing photos", count: 53 },
      { label: "Unclaimed firms", count: 200 },
      { label: "Event discoveries", count: 18 },
    ]);
  });
});

describe("formatTasksLabel", () => {
  it("pluralises and marks capped counts as a floor", () => {
    expect(formatTasksLabel({ total: 1 })).toBe("1 task");
    expect(formatTasksLabel({ total: 28 })).toBe("28 tasks");
    expect(formatTasksLabel({ total: 285, capped: true })).toBe("285+ tasks");
    expect(formatTasksLabel(undefined)).toBe("0 tasks");
  });
});

describe("formatWeekLabel", () => {
  /** weekEnd from the payload is exclusive, so the label shows the last included day. */
  it("renders a week inside one month", () => {
    expect(formatWeekLabel("2026-07-20", "2026-07-27")).toBe("20–26 July");
  });

  it("renders a week that crosses a month boundary", () => {
    expect(formatWeekLabel("2026-07-27", "2026-08-03")).toBe("27 July – 2 August");
  });

  it("derives the end from the start when weekEnd is absent", () => {
    expect(formatWeekLabel("2026-07-20")).toBe("20–26 July");
  });

  it("degrades to a generic label for a missing or malformed date", () => {
    expect(formatWeekLabel(undefined)).toBe("this week");
    expect(formatWeekLabel("not-a-date")).toBe("this week");
    expect(formatWeekLabel(null, null)).toBe("this week");
  });
});

describe("chapterName and digestSubject", () => {
  it("falls back when the chapter name is missing or blank", () => {
    expect(chapterName({ chapterName: "London" })).toBe("London");
    expect(chapterName({ chapterName: "  " })).toBe("your chapter");
    expect(chapterName(undefined)).toBe("your chapter");
  });

  it("builds the subject line", () => {
    expect(digestSubject("London")).toBe("Your week in London — Plano");
  });
});

describe("digestPreviewLine", () => {
  it("leads with the recipient's own contributions", () => {
    expect(
      digestPreviewLine({ chapterName: "London", you: { total: 3 }, tasks: { total: 12 } }),
    ).toBe("3 contributions in London this week — 12 tasks waiting.");
  });

  it("singularises one contribution", () => {
    expect(
      digestPreviewLine({ chapterName: "London", you: { total: 1 }, tasks: { total: 1 } }),
    ).toBe("1 contribution in London this week — 1 task waiting.");
  });

  it("uses the zero-state wording for an empty week", () => {
    expect(
      digestPreviewLine({ chapterName: "London", you: { total: 0 }, tasks: { total: 12 } }),
    ).toBe("Nothing logged in London this week — 12 tasks waiting.");
  });

  it("never renders undefined or NaN for a partial payload", () => {
    for (const input of [undefined, null, {}, { you: {} }]) {
      const line = digestPreviewLine(input);
      expect(line).not.toContain("undefined");
      expect(line).not.toContain("NaN");
    }
  });
});
