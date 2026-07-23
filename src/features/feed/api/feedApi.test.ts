import { describe, it, expect } from "vitest";
import { mapRawFeedRow } from "@/features/feed/api/feedApi";
import type { RawFeedRow } from "@/types/feed";

const baseRow: RawFeedRow = {
  id: "post-1",
  content: "A great building",
  rating: 4,
  created_at: "2026-06-01T00:00:00Z",
  is_liked: false,
  user_data: { username: "alice", avatar_url: null },
  building_data: { id: "b-1", name: "Tower" },
};

describe("mapRawFeedRow — discovery fields", () => {
  it("round-trips connectors, connectors_count, ring-3 and location_match", () => {
    const row: RawFeedRow = {
      ...baseRow,
      ring: 2,
      connectors_count: 5,
      location_match: "city",
      connectors: [
        { id: "u-1", username: "bob", avatar_url: "a.png" },
        { id: "u-2", username: "carol", avatar_url: null },
      ],
    };

    const mapped = mapRawFeedRow(row);

    expect(mapped.ring).toBe(2);
    expect(mapped.connectors_count).toBe(5);
    expect(mapped.location_match).toBe("city");
    expect(mapped.connectors).toEqual([
      { id: "u-1", username: "bob", avatar_url: "a.png" },
      { id: "u-2", username: "carol", avatar_url: null },
    ]);
  });

  it("parses connectors delivered as a JSON string", () => {
    const row: RawFeedRow = {
      ...baseRow,
      connectors: JSON.stringify([
        { id: "u-9", username: "dave", avatar_url: null },
      ]) as unknown as RawFeedRow["connectors"],
    };

    const mapped = mapRawFeedRow(row);

    expect(mapped.connectors).toEqual([
      { id: "u-9", username: "dave", avatar_url: null },
    ]);
    // Falls back to connectors.length when connectors_count is absent.
    expect(mapped.connectors_count).toBe(1);
  });

  it("leaves discovery fields undefined for followed-feed rows", () => {
    const mapped = mapRawFeedRow(baseRow);

    expect(mapped.connectors).toBeUndefined();
    expect(mapped.connectors_count).toBeUndefined();
    expect(mapped.location_match).toBeUndefined();
    expect(mapped.ring).toBeUndefined();
  });
});

describe("mapRawFeedRow — video_url", () => {
  it("passes video_url through so a video-only post reads as media", () => {
    const row: RawFeedRow = {
      ...baseRow,
      content: null,
      video_url: "https://vid/post-1.mp4",
    };

    const mapped = mapRawFeedRow(row);

    expect(mapped.video_url).toBe("https://vid/post-1.mp4");
  });

  it("defaults video_url to null when the RPC omits it", () => {
    expect(mapRawFeedRow(baseRow).video_url).toBeNull();
  });
});
