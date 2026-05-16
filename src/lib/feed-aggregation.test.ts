import { describe, it, expect } from "vitest";
import {
  aggregateFeed,
  collapseIntoRows,
  type AggregatedFeedItem,
} from "@/lib/feed-aggregation";
import { resolveCardType } from "@/features/posts/utils/resolveCardType";
import type { FeedReview, ReviewBuilding } from "@/types/feed";

const building = (
  id: string,
  mainImageUrl: string | null = null,
  communityPreviewUrl: string | null = null,
): ReviewBuilding => ({
  id,
  name: `Building ${id}`,
  main_image_url: mainImageUrl,
  community_preview_url: communityPreviewUrl,
});

const user = (seed: string) => ({
  username: `user-${seed}`,
  avatar_url: null as string | null,
  followers_count: null as number | null,
});

function makeReview(
  partial: Pick<FeedReview, "id" | "user_id" | "created_at" | "building"> &
    Partial<Omit<FeedReview, "id" | "user_id" | "created_at" | "building">>,
): FeedReview {
  const uid = partial.user_id ?? "u-default";
  return {
    id: partial.id,
    content: partial.content ?? null,
    rating: partial.rating ?? null,
    created_at: partial.created_at,
    edited_at: partial.edited_at ?? null,
    status: partial.status,
    user_id: uid,
    user: partial.user ?? user(uid),
    building: partial.building,
    likes_count: partial.likes_count ?? 0,
    comments_count: partial.comments_count ?? 0,
    is_liked: partial.is_liked ?? false,
    images: partial.images,
    tags: partial.tags,
    video_url: partial.video_url ?? null,
    watch_with_users: partial.watch_with_users,
    is_suggested: partial.is_suggested,
    suggestion_reason: partial.suggestion_reason,
  };
}

describe("collapseIntoRows", () => {
  it("returns [] for an empty array", () => {
    expect(collapseIntoRows([])).toEqual([]);
  });

  it("returns a single item unchanged", () => {
    const one: AggregatedFeedItem = {
      type: "compact",
      entry: makeReview({
        id: "r1",
        user_id: "a",
        created_at: "2025-01-01T12:00:00Z",
        building: building("b1"),
        content: "x",
      }),
    };
    expect(collapseIntoRows([one])).toEqual([one]);
  });

  it("pairs two compact items into one row", () => {
    const a = makeReview({
      id: "1",
      user_id: "a",
      created_at: "2025-01-03T12:00:00Z",
      building: building("x"),
      content: "note",
    });
    const b = makeReview({
      id: "2",
      user_id: "b",
      created_at: "2025-01-02T12:00:00Z",
      building: building("y"),
      content: "note",
    });
    const sa = resolveCardType(a);
    const sb = resolveCardType(b);
    const out = collapseIntoRows([
      { type: "compact", entry: a, cardType: sa },
      { type: "compact", entry: b, cardType: sb },
    ]);
    expect(out).toEqual([
      {
        type: "row",
        left: { type: "compact", entry: a, cardType: sa },
        right: { type: "compact", entry: b, cardType: sb },
      },
    ]);
  });

  it("produces one row and one compact for three compact items", () => {
    const r1 = makeReview({
      id: "1",
      user_id: "a",
      created_at: "2025-01-03T12:00:00Z",
      building: building("x"),
      content: "n",
    });
    const r2 = makeReview({
      id: "2",
      user_id: "b",
      created_at: "2025-01-02T12:00:00Z",
      building: building("y"),
      content: "n",
    });
    const r3 = makeReview({
      id: "3",
      user_id: "c",
      created_at: "2025-01-01T12:00:00Z",
      building: building("z"),
      content: "n",
    });
    const s1 = resolveCardType(r1);
    const s2 = resolveCardType(r2);
    const s3 = resolveCardType(r3);
    const out = collapseIntoRows([
      { type: "compact", entry: r1, cardType: s1 },
      { type: "compact", entry: r2, cardType: s2 },
      { type: "compact", entry: r3, cardType: s3 },
    ]);
    expect(out.length).toBe(2);
    expect(out[0]).toEqual({
      type: "row",
      left: { type: "compact", entry: r1, cardType: s1 },
      right: { type: "compact", entry: r2, cardType: s2 },
    });
    expect(out[1]).toEqual({ type: "compact", entry: r3, cardType: s3 });
  });

  it("does not pair compact next to activity", () => {
    const compact = makeReview({
      id: "c",
      user_id: "a",
      created_at: "2025-01-02T12:00:00Z",
      building: building("b1"),
      content: "hello",
    });
    const act = makeReview({
      id: "a1",
      user_id: "b",
      created_at: "2025-01-01T12:00:00Z",
      building: building("b2", "https://img.test/x.jpg"),
      content: null,
      rating: null,
      images: [],
      status: "visited",
    });
    const out = collapseIntoRows([
      { type: "compact", entry: compact },
      {
        type: "activity",
        entry: act,
        activityStatus: "visited",
      },
    ]);
    expect(out).toEqual([
      { type: "compact", entry: compact },
      { type: "activity", entry: act, activityStatus: "visited" },
    ]);
  });

  it("does not pair compacts across an intervening cluster", () => {
    const r1 = makeReview({
      id: "1",
      user_id: "a",
      created_at: "2025-01-03T12:00:00Z",
      building: building("x"),
      content: "n",
    });
    const r2 = makeReview({
      id: "2",
      user_id: "b",
      created_at: "2025-01-02T12:00:00Z",
      building: building("y"),
      content: "n",
    });
    const r3 = makeReview({
      id: "3",
      user_id: "b",
      created_at: "2025-01-02T10:00:00Z",
      building: building("z"),
      content: "n",
    });
    const r4 = makeReview({
      id: "4",
      user_id: "c",
      created_at: "2025-01-01T12:00:00Z",
      building: building("w"),
      content: "n",
    });
    const cluster: AggregatedFeedItem = {
      type: "cluster",
      entries: [r2, r3],
      user: r2.user,
      location: undefined,
      timestamp: r2.created_at,
    };
    const out = collapseIntoRows([
      { type: "compact", entry: r1 },
      cluster,
      { type: "compact", entry: r4 },
    ]);
    expect(out).toEqual([
      { type: "compact", entry: r1 },
      cluster,
      { type: "compact", entry: r4 },
    ]);
  });
});

describe("aggregateFeed", () => {
  it("emits activity when Rule 0 matches including main_image_url", () => {
    const r = makeReview({
      id: "x",
      user_id: "u",
      created_at: "2025-01-01T12:00:00Z",
      building: building("b", "https://img.test/a.jpg"),
      content: null,
      rating: null,
      images: [],
      status: "visited",
    });
    const out = aggregateFeed([r]);
    expect(out).toEqual([
      { type: "activity", entry: r, activityStatus: "visited", cardType: resolveCardType(r) },
    ]);
  });

  it("falls through to compact when Rule 0 matches but no building image fields", () => {
    const r = makeReview({
      id: "x",
      user_id: "u",
      created_at: "2025-01-01T12:00:00Z",
      building: building("b", null, null),
      content: null,
      rating: null,
      images: [],
      status: "pending",
    });
    const out = aggregateFeed([r]);
    expect(out).toEqual([{ type: "compact", entry: r, cardType: resolveCardType(r) }]);
  });

  it("emits activity when Rule 0 matches with community_preview_url only", () => {
    const r = makeReview({
      id: "x",
      user_id: "u",
      created_at: "2025-01-01T12:00:00Z",
      building: building("b", null, "review_images/b/preview.jpg"),
      content: null,
      rating: null,
      images: [],
      status: "visited",
    });
    const out = aggregateFeed([r]);
    expect(out).toEqual([
      { type: "activity", entry: r, activityStatus: "visited", cardType: resolveCardType(r) },
    ]);
  });

  it("produces one row from two non-clustering compact reviews", () => {
    const r1 = makeReview({
      id: "1",
      user_id: "a",
      created_at: "2025-01-03T12:00:00Z",
      building: building("b1"),
      content: "txt",
    });
    const r2 = makeReview({
      id: "2",
      user_id: "b",
      created_at: "2025-01-02T12:00:00Z",
      building: building("b2"),
      content: "txt",
    });
    const out = aggregateFeed([r1, r2]);
    expect(out.length).toBe(1);
    expect(out[0]?.type).toBe("row");
    if (out[0]?.type === "row") {
      expect(out[0].left).toEqual({
        type: "compact",
        entry: r1,
        cardType: resolveCardType(r1),
      });
      expect(out[0].right).toEqual({
        type: "compact",
        entry: r2,
        cardType: resolveCardType(r2),
      });
    }
  });

  it("produces one row and one compact for three non-clustering compacts", () => {
    const r1 = makeReview({
      id: "1",
      user_id: "a",
      created_at: "2025-01-03T12:00:00Z",
      building: building("b1"),
      content: "t",
    });
    const r2 = makeReview({
      id: "2",
      user_id: "b",
      created_at: "2025-01-02T12:00:00Z",
      building: building("b2"),
      content: "t",
    });
    const r3 = makeReview({
      id: "3",
      user_id: "c",
      created_at: "2025-01-01T12:00:00Z",
      building: building("b3"),
      content: "t",
    });
    const out = aggregateFeed([r1, r2, r3]);
    expect(out.length).toBe(2);
    expect(out[0]?.type).toBe("row");
    if (out[0]?.type === "row") {
      expect(out[0].left).toEqual({
        type: "compact",
        entry: r1,
        cardType: resolveCardType(r1),
      });
      expect(out[0].right).toEqual({
        type: "compact",
        entry: r2,
        cardType: resolveCardType(r2),
      });
    }
    expect(out[1]).toEqual({ type: "compact", entry: r3, cardType: resolveCardType(r3) });
  });

  it("keeps compact and activity as separate full-width items", () => {
    const compact = makeReview({
      id: "c",
      user_id: "a",
      created_at: "2025-01-02T12:00:00Z",
      building: building("b1"),
      content: "hello",
    });
    const act = makeReview({
      id: "a1",
      user_id: "b",
      created_at: "2025-01-01T12:00:00Z",
      building: building("b2", "https://img.test/x.jpg"),
      content: null,
      rating: null,
      images: [],
      status: "visited",
    });
    const out = aggregateFeed([compact, act]);
    expect(out).toEqual([
      { type: "compact", entry: compact, cardType: resolveCardType(compact) },
      { type: "activity", entry: act, activityStatus: "visited", cardType: resolveCardType(act) },
    ]);
  });

  it("does not pair compacts across a cluster", () => {
    const r1 = makeReview({
      id: "1",
      user_id: "a",
      created_at: "2025-01-03T12:00:00Z",
      building: building("x"),
      content: "n",
    });
    const r2 = makeReview({
      id: "2",
      user_id: "b",
      created_at: "2025-01-02T12:00:00Z",
      building: building("y"),
      content: "n",
    });
    const r3 = makeReview({
      id: "3",
      user_id: "b",
      created_at: "2025-01-02T10:00:00Z",
      building: building("z"),
      content: "n",
    });
    const r4 = makeReview({
      id: "4",
      user_id: "c",
      created_at: "2025-01-01T12:00:00Z",
      building: building("w"),
      content: "n",
    });
    const out = aggregateFeed([r1, r2, r3, r4]);
    expect(out.length).toBe(3);
    expect(out[0]).toEqual({ type: "compact", entry: r1, cardType: resolveCardType(r1) });
    expect(out[1]?.type).toBe("cluster");
    expect(out[2]).toEqual({ type: "compact", entry: r4, cardType: resolveCardType(r4) });
  });
});
