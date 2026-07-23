import { describe, expect, it } from "vitest";
import { buildReviewImageRow, nextBuildingAfter } from "./photoUpload";

describe("buildReviewImageRow", () => {
  it("assembles the review_images row from ids, storage key, and dimensions", () => {
    expect(
      buildReviewImageRow({
        reviewId: "post-1",
        userId: "user-1",
        storagePath: "post-1/photo.jpg",
        widthPx: 1200,
        heightPx: 800,
      }),
    ).toEqual({
      review_id: "post-1",
      user_id: "user-1",
      storage_path: "post-1/photo.jpg",
      is_generated: false,
      width_px: 1200,
      height_px: 800,
    });
  });

  it("always marks photography uploads as not AI-generated", () => {
    const row = buildReviewImageRow({
      reviewId: "p",
      userId: "u",
      storagePath: "p/x.jpg",
      widthPx: null,
      heightPx: null,
    });
    expect(row.is_generated).toBe(false);
  });

  it("passes null dimensions through unchanged", () => {
    const row = buildReviewImageRow({
      reviewId: "p",
      userId: "u",
      storagePath: "p/x.jpg",
      widthPx: null,
      heightPx: null,
    });
    expect(row.width_px).toBeNull();
    expect(row.height_px).toBeNull();
  });
});

describe("nextBuildingAfter", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("advances to the building that currently follows the completed one", () => {
    expect(nextBuildingAfter(list, "a")).toEqual({ id: "b" });
    expect(nextBuildingAfter(list, "b")).toEqual({ id: "c" });
  });

  it("returns null when the completed building was the last in the queue", () => {
    expect(nextBuildingAfter(list, "c")).toBeNull();
  });

  it("returns null when the completed building is not in the list", () => {
    expect(nextBuildingAfter(list, "z")).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(nextBuildingAfter([], "a")).toBeNull();
  });
});
