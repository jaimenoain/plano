import { describe, expect, it } from "vitest";
import { buildFlagReportRow } from "./reports";

describe("buildFlagReportRow", () => {
  it("produces a row the admin moderation queue can consume", () => {
    const row = buildFlagReportRow({
      reporterId: "user-1",
      contentType: "photo",
      contentId: "img-9",
      reasonLabel: "Inappropriate content",
      label: "Photo on Casa Batlló",
    });

    // The admin queue reads reported_id as the content id, filters out
    // resolved/dismissed statuses, and resolves the kind via content_type.
    expect(row).toEqual({
      reporter_id: "user-1",
      reported_id: "img-9",
      content_type: "photo",
      reason: "Inappropriate content",
      details: "Photo on Casa Batlló",
      status: "pending",
    });
    expect(["resolved", "dismissed"]).not.toContain(row.status);
  });

  it.each(["building", "photo", "video", "credit"] as const)(
    "stamps content_type %s",
    (contentType) => {
      const row = buildFlagReportRow({
        reporterId: "u",
        contentType,
        contentId: "c",
        reasonLabel: "Spam or off-topic",
        label: "x",
      });
      expect(row.content_type).toBe(contentType);
    },
  );
});
