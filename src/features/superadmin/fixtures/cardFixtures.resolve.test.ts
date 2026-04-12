import { describe, expect, it } from "vitest";
import { deriveLegacyFeedCardLayout } from "@/features/feed/utils/deriveLegacyFeedCardLayout";
import { cardFixtures } from "./cardFixtures";

describe("cardFixtures expectedLayout", () => {
  it("matches deriveLegacyFeedCardLayout(entry) for every fixture (regression guard)", () => {
    for (const f of cardFixtures) {
      expect(deriveLegacyFeedCardLayout(f.entry), f.id).toEqual(f.expectedLayout);
    }
  });
});
