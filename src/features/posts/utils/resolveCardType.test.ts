import { describe, expect, it } from "vitest";
import type { FeedReview } from "@/types/feed";
import {
  CARD_B_HEIGHT,
  CARD_C_IMAGE_HEIGHT,
  countWords,
  detailTextTreatmentFromWordCount,
  formatDetailMediaMetadataLine,
  partitionDetailOverflowImages,
  resolveCardType,
  resolveDetailVariant,
} from "./resolveCardType";

function baseReview(overrides: Partial<FeedReview> = {}): FeedReview {
  return {
    id: "r1",
    content: null,
    rating: null,
    created_at: "2020-01-01T00:00:00.000Z",
    user: {
      username: "author",
      avatar_url: null,
      followers_count: null,
    },
    building: { id: "b1", name: "Tower" },
    likes_count: 0,
    comments_count: 0,
    is_liked: false,
    ...overrides,
  };
}

const sampleImage = {
  id: "img1",
  url: "https://example.com/a.jpg",
  likes_count: 0,
  is_liked: false,
};

describe("resolveCardType", () => {
  it("exports layout constants", () => {
    expect(CARD_B_HEIGHT).toBe(320);
    expect(CARD_C_IMAGE_HEIGHT).toBe(185);
  });

  it("returns activity when no text and no media", () => {
    expect(resolveCardType(baseReview())).toBe("activity");
  });

  it("returns activity for whitespace-only content and no media", () => {
    expect(resolveCardType(baseReview({ content: " \n\t " }))).toBe("activity");
  });

  it("returns activity for empty string content and no media", () => {
    expect(resolveCardType(baseReview({ content: "" }))).toBe("activity");
  });

  it("returns activity when images array is empty and no video", () => {
    expect(resolveCardType(baseReview({ images: [] }))).toBe("activity");
  });

  it("returns activity when images exist but all URLs are empty", () => {
    expect(
      resolveCardType(
        baseReview({
          images: [
            { id: "1", url: "", likes_count: 0, is_liked: false },
            { id: "2", url: "   ", likes_count: 0, is_liked: false },
          ],
        }),
      ),
    ).toBe("activity");
  });

  it("returns C when there is usable media but no text", () => {
    expect(resolveCardType(baseReview({ images: [sampleImage] }))).toBe("C");
  });

  it("returns C for video only with no review text", () => {
    expect(
      resolveCardType(
        baseReview({ video_url: "https://example.com/v.mp4" }),
      ),
    ).toBe("C");
  });

  it("returns A when there is text but no media", () => {
    expect(resolveCardType(baseReview({ content: "Great building." }))).toBe("A");
  });

  it("returns B when there is text and images", () => {
    expect(
      resolveCardType(
        baseReview({ content: "Nice light.", images: [sampleImage] }),
      ),
    ).toBe("B");
  });

  it("returns B when there is text and video", () => {
    expect(
      resolveCardType(
        baseReview({
          content: "Walkthrough notes",
          video_url: "https://example.com/v.mp4",
        }),
      ),
    ).toBe("B");
  });

  it("treats missing images as no media when content exists", () => {
    const r = baseReview({ content: "Only words" });
    delete (r as Partial<FeedReview>).images;
    expect(resolveCardType(r)).toBe("A");
  });
});

describe("countWords", () => {
  it("returns 0 for null, empty, and whitespace-only", () => {
    expect(countWords(null)).toBe(0);
    expect(countWords(undefined)).toBe(0);
    expect(countWords("")).toBe(0);
    expect(countWords(" \n\t ")).toBe(0);
  });

  it("counts words with normal spacing", () => {
    expect(countWords("one")).toBe(1);
    expect(countWords("one two three")).toBe(3);
  });
});

describe("detailTextTreatmentFromWordCount", () => {
  it("maps 0, 1, 20, 21 boundaries to none / quote / body", () => {
    expect(detailTextTreatmentFromWordCount(0)).toBe("none");
    expect(detailTextTreatmentFromWordCount(1)).toBe("quote");
    expect(detailTextTreatmentFromWordCount(20)).toBe("quote");
    expect(detailTextTreatmentFromWordCount(21)).toBe("body");
  });
});

describe("resolveDetailVariant", () => {
  it("returns activity-aligned none treatment when no text and no media", () => {
    expect(resolveDetailVariant(baseReview())).toEqual({
      hasMedia: false,
      mediaCount: 0,
      textTreatment: "none",
      photoColHeight: 260,
    });
  });

  it("counts media as images plus one video", () => {
    expect(
      resolveDetailVariant(
        baseReview({
          content: "Caption",
          images: [sampleImage, { ...sampleImage, id: "i2" }],
          video_url: "https://example.com/v.mp4",
        }),
      ),
    ).toMatchObject({
      hasMedia: true,
      mediaCount: 3,
      textTreatment: "quote",
      photoColHeight: 300,
    });
  });

  it("uses 400px column height for long copy", () => {
    const long = Array.from({ length: 21 }, () => "word").join(" ");
    expect(resolveDetailVariant(baseReview({ content: long }))).toMatchObject({
      hasMedia: false,
      mediaCount: 0,
      textTreatment: "body",
      photoColHeight: 400,
    });
  });

  it("uses none treatment and 260px height when only media, no text", () => {
    expect(resolveDetailVariant(baseReview({ images: [sampleImage] }))).toEqual({
      hasMedia: true,
      mediaCount: 1,
      textTreatment: "none",
      photoColHeight: 260,
    });
  });
});

describe("partitionDetailOverflowImages", () => {
  const img = (id: string): (typeof sampleImage & { id: string }) => ({ ...sampleImage, id });

  it("returns no rows for empty input", () => {
    expect(partitionDetailOverflowImages([])).toEqual([]);
  });

  it("uses one full-width row for a single overflow image", () => {
    expect(partitionDetailOverflowImages([img("a")])).toEqual([
      { columnCount: 2, images: [img("a")] },
    ]);
  });

  it("pairs into one 2-column row for two images", () => {
    expect(partitionDetailOverflowImages([img("a"), img("b")])).toEqual([
      { columnCount: 2, images: [img("a"), img("b")] },
    ]);
  });

  it("uses one 3-column row for three images", () => {
    expect(partitionDetailOverflowImages([img("a"), img("b"), img("c")])).toEqual([
      { columnCount: 3, images: [img("a"), img("b"), img("c")] },
    ]);
  });

  it("uses two 2-column rows for four images", () => {
    expect(partitionDetailOverflowImages([img("a"), img("b"), img("c"), img("d")])).toEqual([
      { columnCount: 2, images: [img("a"), img("b")] },
      { columnCount: 2, images: [img("c"), img("d")] },
    ]);
  });

  it("uses 2-column then 3-column rows for five images", () => {
    expect(
      partitionDetailOverflowImages([img("a"), img("b"), img("c"), img("d"), img("e")]),
    ).toEqual([
      { columnCount: 2, images: [img("a"), img("b")] },
      { columnCount: 3, images: [img("c"), img("d"), img("e")] },
    ]);
  });
});

describe("formatDetailMediaMetadataLine", () => {
  it("joins photos and video", () => {
    expect(
      formatDetailMediaMetadataLine(
        baseReview({
          images: [sampleImage, { ...sampleImage, id: "img2" }],
          video_url: "https://example.com/v.mp4",
        }),
      ),
    ).toBe("2 photos · 1 video");
  });

  it("uses singular photo", () => {
    expect(formatDetailMediaMetadataLine(baseReview({ images: [sampleImage] }))).toBe("1 photo");
  });

  it("uses video only when no stills", () => {
    expect(formatDetailMediaMetadataLine(baseReview({ video_url: "https://example.com/v.mp4" }))).toBe(
      "1 video",
    );
  });

  it("returns empty string with no usable media", () => {
    expect(formatDetailMediaMetadataLine(baseReview())).toBe("");
  });
});
