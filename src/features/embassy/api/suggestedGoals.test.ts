import { describe, expect, it } from "vitest";
import { buildSuggestedGoals, type BacklogCounts } from "./suggestedGoals";

const ZERO_COUNTS: BacklogCounts = { research: 0, moderation: 0, photos: 0, outreach: 0, events: 0 };

describe("buildSuggestedGoals", () => {
  it("returns no suggestions when every backlog is empty", () => {
    expect(buildSuggestedGoals(ZERO_COUNTS)).toEqual([]);
  });

  it("omits a metric with a zero backlog while including the rest", () => {
    const suggestions = buildSuggestedGoals({ ...ZERO_COUNTS, research: 3, outreach: 0 });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ metric: "research", target: 3 });
  });

  it("includes one suggestion per non-zero backlog, in a stable order", () => {
    const suggestions = buildSuggestedGoals({
      research: 4,
      moderation: 1,
      photos: 12,
      outreach: 2,
      events: 1,
    });
    expect(suggestions.map((s) => s.metric)).toEqual([
      "research",
      "moderation",
      "photos",
      "outreach",
      "events",
    ]);
  });

  it("singularizes the title text when the count is exactly one", () => {
    const suggestions = buildSuggestedGoals({ ...ZERO_COUNTS, moderation: 1 });
    expect(suggestions[0].title).toBe("Moderate 1 pending building");
  });

  it("pluralizes the title text when the count is greater than one", () => {
    const suggestions = buildSuggestedGoals({ ...ZERO_COUNTS, moderation: 5 });
    expect(suggestions[0].title).toBe("Moderate 5 pending buildings");
  });

  it("sets the suggested target to the raw backlog count", () => {
    const suggestions = buildSuggestedGoals({ ...ZERO_COUNTS, events: 7 });
    expect(suggestions[0].target).toBe(7);
  });
});
