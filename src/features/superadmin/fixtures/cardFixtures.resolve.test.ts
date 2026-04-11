import { describe, expect, it } from "vitest";
import { resolveCardSpec } from "@/features/feed/utils/resolveCardSpec";
import { cardFixtures } from "./cardFixtures";

describe("cardFixtures expectedSpec", () => {
  it("matches resolveCardSpec(entry) for every fixture (regression guard)", () => {
    for (const f of cardFixtures) {
      expect(resolveCardSpec(f.entry), f.id).toEqual(f.expectedSpec);
    }
  });
});
