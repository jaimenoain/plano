import { describe, expect, it } from "vitest";
import { collectionPath } from "./collectionPath";

describe("collectionPath", () => {
  it("builds the /:username/map/:slug route", () => {
    expect(collectionPath({ ownerUsername: "jane", slug: "favourites" })).toBe(
      "/jane/map/favourites",
    );
  });
});
