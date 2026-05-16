import { describe, expect, it } from "vitest";
import { deriveLegacyFeedUi } from "@/features/posts/utils/deriveLegacyFeedUi";
import { cardFixtures } from "./cardFixtures";

describe("cardFixtures expectedLayout", () => {
  it("matches deriveLegacyFeedUi(entry) for every fixture (regression guard)", () => {
    for (const f of cardFixtures) {
      expect(deriveLegacyFeedUi(f.entry), f.id).toEqual(f.expectedLayout);
    }
  });
});
