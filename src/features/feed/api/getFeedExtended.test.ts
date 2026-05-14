import { describe, it, expect } from "vitest";
import { buildExtendedAttribution } from "./getFeedExtended";

describe("buildExtendedAttribution", () => {
  it("returns fallback string when endorsers list is empty", () => {
    expect(buildExtendedAttribution([])).toBe("Liked by someone you follow");
  });

  it("returns singular form for exactly one endorser", () => {
    expect(buildExtendedAttribution([{ username: "Alice" }])).toBe(
      "Liked by Alice, who you follow",
    );
  });

  it("returns dual form for exactly two endorsers", () => {
    expect(
      buildExtendedAttribution([{ username: "Alice" }, { username: "Bob" }]),
    ).toBe("Liked by Alice and Bob");
  });

  it("returns plural form for three endorsers (count - 1 = 2)", () => {
    expect(
      buildExtendedAttribution([
        { username: "Alice" },
        { username: "Bob" },
        { username: "Carol" },
      ]),
    ).toBe("Liked by Alice and 2 others you follow");
  });

  it("returns plural form for four endorsers (count - 1 = 3)", () => {
    expect(
      buildExtendedAttribution([
        { username: "Alice" },
        { username: "Bob" },
        { username: "Carol" },
        { username: "Dave" },
      ]),
    ).toBe("Liked by Alice and 3 others you follow");
  });
});
