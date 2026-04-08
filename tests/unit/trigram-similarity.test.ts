import { describe, expect, it } from "vitest";
import { trigramSimilarity } from "@/lib/trigram-similarity";

describe("trigramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(trigramSimilarity("Norman Foster", "Norman Foster")).toBe(1);
  });

  it("scores typos close to the original above 0.4", () => {
    const s = trigramSimilarity("Norman Foster", "Norman Fostr");
    expect(s).toBeGreaterThan(0.4);
  });

  it("scores unrelated strings low", () => {
    const s = trigramSimilarity("Zyzzyva Studios", "Norman Foster");
    expect(s).toBeLessThanOrEqual(0.4);
  });
});
