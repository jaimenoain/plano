import { describe, expect, it } from "vitest";
import { buildHaystack, matchesAllTokens, normalizeSearchText, tokenize } from "./searchText";

describe("normalizeSearchText", () => {
  it("lowercases and folds diacritics", () => {
    expect(normalizeSearchText("Gaudí")).toBe("gaudi");
    expect(normalizeSearchText("Museu Blau")).toBe("museu blau");
    expect(normalizeSearchText("Jørn Utzon")).toBe("jørn utzon");
  });

  it("collapses whitespace and trims", () => {
    expect(normalizeSearchText("  Zaha   Hadid \n")).toBe("zaha hadid");
  });

  it("accepts numbers and nullish values", () => {
    expect(normalizeSearchText(1973)).toBe("1973");
    expect(normalizeSearchText(null)).toBe("");
    expect(normalizeSearchText(undefined)).toBe("");
  });
});

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("zaha london")).toEqual(["zaha", "london"]);
  });

  it("returns no tokens for empty or whitespace-only queries", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });

  it("keeps punctuation as part of the token", () => {
    expect(tokenize("O'Gorman")).toEqual(["o'gorman"]);
  });
});

describe("matchesAllTokens", () => {
  it("requires every token (AND, not OR)", () => {
    const haystack = "casa mila gaudi barcelona spain";
    expect(matchesAllTokens(haystack, ["gaudi", "barcelona"])).toBe(true);
    expect(matchesAllTokens(haystack, ["gaudi", "london"])).toBe(false);
  });

  it("matches everything when there are no tokens", () => {
    expect(matchesAllTokens("anything", [])).toBe(true);
  });
});

describe("buildHaystack", () => {
  it("normalizes and joins, dropping empty parts", () => {
    expect(buildHaystack(["Casa Milà", null, "Barcelona", undefined, 1912])).toBe(
      "casa mila barcelona 1912",
    );
  });
});
