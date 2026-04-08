import { describe, it, expect } from "vitest";
import {
  shouldShowAutoHideCountdown,
  isVerifiedFlaggedCredit,
  formatAutoHideCountdown,
  autoHideDeadlineMs,
  FLAGGED_AUTO_HIDE_DAYS,
} from "@/lib/flagged-credit-moderation";

describe("flagged-credit-moderation", () => {
  it("isVerifiedFlaggedCredit", () => {
    expect(isVerifiedFlaggedCredit("verified")).toBe(true);
    expect(isVerifiedFlaggedCredit("active")).toBe(false);
    expect(isVerifiedFlaggedCredit(null)).toBe(false);
  });

  it("shouldShowAutoHideCountdown rejects verified-origin flags", () => {
    expect(
      shouldShowAutoHideCountdown("verified", { id: "p", claimStatus: "unclaimed" }, null),
    ).toBe(false);
  });

  it("shouldShowAutoHideCountdown requires all linked entities unclaimed", () => {
    expect(
      shouldShowAutoHideCountdown("active", { id: "p", claimStatus: "unclaimed" }, null),
    ).toBe(true);
    expect(
      shouldShowAutoHideCountdown("active", { id: "p", claimStatus: "claimed" }, null),
    ).toBe(false);
    expect(
      shouldShowAutoHideCountdown(
        "active",
        { id: "p", claimStatus: "unclaimed" },
        { id: "c", claimStatus: "claimed" },
      ),
    ).toBe(false);
    expect(
      shouldShowAutoHideCountdown(
        "active",
        { id: "p", claimStatus: "unclaimed" },
        { id: "c", claimStatus: "unclaimed" },
      ),
    ).toBe(true);
  });

  it("autoHideDeadlineMs and formatAutoHideCountdown", () => {
    const flaggedAt = "2026-01-01T00:00:00.000Z";
    const end = autoHideDeadlineMs(flaggedAt);
    expect(end).not.toBeNull();
    const msPerDay = 24 * 60 * 60 * 1000;
    expect(end).toBe(Date.parse(flaggedAt) + FLAGGED_AUTO_HIDE_DAYS * msPerDay);

    const beforeEnd = Date.parse(flaggedAt) + 2 * msPerDay;
    const text = formatAutoHideCountdown(flaggedAt, beforeEnd);
    expect(text).toMatch(/left/);

    const afterEnd = end! + 1000;
    expect(formatAutoHideCountdown(flaggedAt, afterEnd)).toBe("Past auto-hide window");
  });
});
