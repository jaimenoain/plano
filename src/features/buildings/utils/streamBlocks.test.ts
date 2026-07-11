import { describe, expect, it } from "vitest";
import { buildStreamBlocks } from "./streamBlocks";
import type { DisplayImage, FeedEntry } from "../hooks/buildingCommunityData";

function makeEntry(overrides: Partial<FeedEntry> = {}): FeedEntry {
  return {
    id: "entry-1",
    user_id: "user-1",
    content: null,
    rating: null,
    status: "visited",
    tags: null,
    created_at: "2026-01-01T00:00:00Z",
    user: { username: "ada", avatar_url: null },
    images: [],
    ...overrides,
  };
}

function makeImage(overrides: Partial<DisplayImage> = {}): DisplayImage {
  return {
    id: "img-1",
    url: "https://example.com/img-1.jpg",
    likes_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    user: { username: "ada", avatar_url: null },
    ...overrides,
  };
}

function byId(images: DisplayImage[]): Map<string, DisplayImage> {
  return new Map(images.map((img) => [img.id, img]));
}

describe("buildStreamBlocks", () => {
  it("classifies an entry with an official image as featured", () => {
    const img = makeImage({ is_official: true });
    const entry = makeEntry({ images: [{ id: img.id, storage_path: "p" }] });
    const blocks = buildStreamBlocks([entry], [img], byId([img]));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].blockType).toBe("featured");
  });

  it("classifies an entry with two or more images as mosaic", () => {
    const imgs = [makeImage({ id: "a" }), makeImage({ id: "b" })];
    const entry = makeEntry({
      images: imgs.map((i) => ({ id: i.id, storage_path: "p" })),
    });
    const blocks = buildStreamBlocks([entry], imgs, byId(imgs));
    expect(blocks[0].blockType).toBe("mosaic");
  });

  it("classifies one image plus text as image-review", () => {
    const img = makeImage();
    const entry = makeEntry({
      content: "A house that argues.",
      images: [{ id: img.id, storage_path: "p" }],
    });
    const blocks = buildStreamBlocks([entry], [img], byId([img]));
    expect(blocks[0].blockType).toBe("image-review");
  });

  it("classifies one image without text as image-only, text without images as text-only", () => {
    const img = makeImage();
    const imageEntry = makeEntry({ images: [{ id: img.id, storage_path: "p" }] });
    const textEntry = makeEntry({ id: "entry-2", content: "Essential." });
    const blocks = buildStreamBlocks([imageEntry, textEntry], [img], byId([img]));
    const types = blocks.map((b) => b.blockType).sort();
    expect(types).toEqual(["image-only", "text-only"]);
  });

  it("drops entries with no content, images, or video", () => {
    const blocks = buildStreamBlocks([makeEntry()], [], byId([]));
    expect(blocks).toHaveLength(0);
  });

  it("treats a video-only entry as image-only via the video-<id> display image", () => {
    const video = makeImage({ id: "video-entry-1", type: "video" });
    const entry = makeEntry();
    const blocks = buildStreamBlocks([entry], [video], byId([video]));
    // Video is claimed by the entry, so no orphan duplicate appears.
    expect(blocks).toHaveLength(1);
    expect(blocks[0].blockType).toBe("image-only");
    expect(blocks[0].entryId).toBe("entry-1");
  });

  it("turns images with no owning entry into orphan blocks", () => {
    const orphan = makeImage({ id: "loose", likes_count: 3 });
    const blocks = buildStreamBlocks([], [orphan], byId([orphan]));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe("img-loose");
    expect(blocks[0].blockType).toBe("image-only");
    expect(blocks[0].score).toBe(30);
  });

  it("promotes official orphan images to featured", () => {
    const orphan = makeImage({ id: "loose", is_official: true });
    const blocks = buildStreamBlocks([], [orphan], byId([orphan]));
    expect(blocks[0].blockType).toBe("featured");
  });

  it("sorts by score: official > architect-of-building > liked > plain", () => {
    const official = makeImage({ id: "official", is_official: true });
    const liked = makeImage({ id: "liked", likes_count: 5 });
    const plain = makeImage({ id: "plain" });
    const entries = [
      makeEntry({ id: "e-plain", images: [{ id: "plain", storage_path: "p" }] }),
      makeEntry({
        id: "e-architect",
        content: "From the drawing board.",
        user: {
          username: "corb",
          avatar_url: null,
          is_architect_of_building: true,
        },
      }),
      makeEntry({ id: "e-liked", images: [{ id: "liked", storage_path: "p" }] }),
      makeEntry({ id: "e-official", images: [{ id: "official", storage_path: "p" }] }),
    ];
    const imgs = [official, liked, plain];
    const blocks = buildStreamBlocks(entries, imgs, byId(imgs));
    expect(blocks.map((b) => b.entryId)).toEqual([
      "e-official",
      "e-architect",
      "e-liked",
      "e-plain",
    ]);
  });
});
