import { describe, it, expect } from "vitest";
import {
  collapseCompactRuns,
  groupHomeFeedEntries,
  promoteFirstMediaEntry,
} from "@/features/feed/utils/groupActivitySummary";
import type { FeedEventAttendance, FeedReview, ReviewBuilding } from "@/types/feed";

const building = (id: string): ReviewBuilding => ({
  id,
  name: `Building ${id}`,
  main_image_url: `https://img/${id}.jpg`,
  community_preview_url: null,
});

function visit(
  partial: Pick<FeedReview, "id"> & Partial<FeedReview>,
): FeedReview {
  const uid = partial.user_id ?? "u1";
  return {
    id: partial.id,
    content: partial.content ?? null,
    rating: partial.rating ?? null,
    created_at: partial.created_at ?? "2026-06-29T12:00:00Z",
    edited_at: partial.edited_at ?? null,
    status: partial.status ?? "visited",
    user_id: uid,
    user: partial.user ?? {
      username: `user-${uid}`,
      avatar_url: null,
      followers_count: null,
    },
    building: partial.building ?? building(partial.id),
    likes_count: 0,
    comments_count: 0,
    is_liked: false,
    images: partial.images,
    video_url: partial.video_url ?? null,
  };
}

function eventAttendance(id: string): FeedEventAttendance {
  return {
    id,
    rowType: "event_attendance",
    eventId: id,
    title: `Event ${id}`,
    slug: id,
    startAt: "2026-06-29T18:00:00Z",
    endAt: null,
    address: null,
    coverImageUrl: null,
    claimStatus: "claimed",
    actors: [],
    createdAt: "2026-06-29T11:00:00Z",
  };
}

describe("groupHomeFeedEntries", () => {
  it("collapses a run of 3+ same-user light visits into one summary", () => {
    const items = groupHomeFeedEntries([
      visit({ id: "a" }),
      visit({ id: "b" }),
      visit({ id: "c" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "activity-summary", key: "activity-a" });
    if (items[0].kind === "activity-summary") {
      expect(items[0].entries.map((e) => e.id)).toEqual(["a", "b", "c"]);
    }
  });

  it("keeps a run of 2 as individual entries", () => {
    const items = groupHomeFeedEntries([visit({ id: "a" }), visit({ id: "b" })]);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.kind === "entry")).toBe(true);
  });

  it("breaks the run on a different user", () => {
    const items = groupHomeFeedEntries([
      visit({ id: "a", user_id: "u1" }),
      visit({ id: "b", user_id: "u1" }),
      visit({ id: "c", user_id: "u2" }),
    ]);
    // u1 run is only 2 → individual; u2 has 1 → individual.
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.kind === "entry")).toBe(true);
  });

  it("breaks the run on a different status", () => {
    const items = groupHomeFeedEntries([
      visit({ id: "a", status: "visited" }),
      visit({ id: "b", status: "visited" }),
      visit({ id: "c", status: "pending" }),
    ]);
    expect(items.some((i) => i.kind === "activity-summary")).toBe(false);
  });

  it("breaks the run across calendar days", () => {
    const items = groupHomeFeedEntries([
      visit({ id: "a", created_at: "2026-06-29T23:00:00Z" }),
      visit({ id: "b", created_at: "2026-06-29T22:00:00Z" }),
      visit({ id: "c", created_at: "2026-06-28T22:00:00Z" }),
    ]);
    expect(items.some((i) => i.kind === "activity-summary")).toBe(false);
  });

  it("does not absorb a post with a photo into the summary", () => {
    const items = groupHomeFeedEntries([
      visit({ id: "a" }),
      visit({ id: "b" }),
      visit({
        id: "photo",
        images: [{ id: "i1", url: "https://img/1.jpg", likes_count: 0, is_liked: false }],
      }),
      visit({ id: "c" }),
    ]);
    // No run reaches 3 consecutive light visits.
    expect(items.some((i) => i.kind === "activity-summary")).toBe(false);
    expect(items).toHaveLength(4);
  });

  it("breaks the run on an interleaved event-attendance row", () => {
    const items = groupHomeFeedEntries([
      visit({ id: "a" }),
      visit({ id: "b" }),
      eventAttendance("e1"),
      visit({ id: "c" }),
      visit({ id: "d" }),
      visit({ id: "e" }),
    ]);
    // First run (a,b) = 2 → individual; event passes through; second run (c,d,e) = 3 → summary.
    const summaries = items.filter((i) => i.kind === "activity-summary");
    expect(summaries).toHaveLength(1);
    if (summaries[0].kind === "activity-summary") {
      expect(summaries[0].entries.map((e) => e.id)).toEqual(["c", "d", "e"]);
    }
  });

  it("preserves order with summaries interleaved among rich entries", () => {
    const items = groupHomeFeedEntries([
      visit({ id: "review", content: "Great building" }),
      visit({ id: "a" }),
      visit({ id: "b" }),
      visit({ id: "c" }),
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: "entry" });
    expect(items[1]).toMatchObject({ kind: "activity-summary" });
  });
});

describe("promoteFirstMediaEntry", () => {
  const photo = (id: string): FeedReview =>
    visit({
      id,
      images: [{ id: `i-${id}`, url: `https://img/${id}.jpg`, likes_count: 0, is_liked: false }],
    });
  const video = (id: string): FeedReview => visit({ id, video_url: `https://vid/${id}.mp4` });

  it("floats the first photo entry to the front, preserving the rest of the order", () => {
    const out = promoteFirstMediaEntry([
      visit({ id: "a" }),
      visit({ id: "b" }),
      photo("p"),
      visit({ id: "c" }),
    ]);
    expect(out.map((e) => e.id)).toEqual(["p", "a", "b", "c"]);
  });

  it("treats a video-only entry as media", () => {
    const out = promoteFirstMediaEntry([visit({ id: "a" }), video("v"), visit({ id: "b" })]);
    expect(out.map((e) => e.id)).toEqual(["v", "a", "b"]);
  });

  it("returns the array unchanged when the first entry already has media", () => {
    const input = [photo("p"), visit({ id: "a" })];
    const out = promoteFirstMediaEntry(input);
    expect(out).toBe(input);
    expect(out.map((e) => e.id)).toEqual(["p", "a"]);
  });

  it("returns the array unchanged when no entry has media", () => {
    const input = [visit({ id: "a" }), visit({ id: "b" })];
    const out = promoteFirstMediaEntry(input);
    expect(out).toBe(input);
  });

  it("does not treat an event-attendance row as media", () => {
    const out = promoteFirstMediaEntry([
      visit({ id: "a" }),
      eventAttendance("e1"),
      photo("p"),
    ]);
    expect(out.map((e) => e.id)).toEqual(["p", "a", "e1"]);
  });

  it("does not mutate the input array", () => {
    const input = [visit({ id: "a" }), photo("p")];
    promoteFirstMediaEntry(input);
    expect(input.map((e) => e.id)).toEqual(["a", "p"]);
  });
});

describe("collapseCompactRuns", () => {
  // Distinct users so groupHomeFeedEntries leaves each as an individual compact `entry`
  // (per-person summaries only form for 3+ same-user visits).
  const distinctVisits = (ids: string[]) =>
    ids.map((id) => visit({ id, user_id: `u-${id}` }));

  it("wraps 5+ consecutive compact rows into one compact-run block", () => {
    const blocks = collapseCompactRuns(
      groupHomeFeedEntries(distinctVisits(["a", "b", "c", "d", "e"])),
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("compact-run");
    if (blocks[0].kind === "compact-run") {
      expect(blocks[0].items).toHaveLength(5);
      expect(blocks[0].key).toBe("compact-run-a");
    }
  });

  it("leaves a run of exactly 4 compact rows as individual item blocks", () => {
    const blocks = collapseCompactRuns(
      groupHomeFeedEntries(distinctVisits(["a", "b", "c", "d"])),
    );
    expect(blocks).toHaveLength(4);
    expect(blocks.every((b) => b.kind === "item")).toBe(true);
  });

  it("breaks the run on an interleaved rich entry", () => {
    const blocks = collapseCompactRuns(
      groupHomeFeedEntries([
        ...distinctVisits(["a", "b", "c"]),
        visit({ id: "review", user_id: "u-review", content: "Great building" }),
        ...distinctVisits(["d", "e", "f"]),
      ]),
    );
    // Each side is only 3 compact rows (<= 4) → no wrapping; rich entry separates them.
    expect(blocks).toHaveLength(7);
    expect(blocks.every((b) => b.kind === "item")).toBe(true);
  });

  it("breaks the run on an interleaved event-attendance row", () => {
    const blocks = collapseCompactRuns(
      groupHomeFeedEntries([
        ...distinctVisits(["a", "b", "c"]),
        eventAttendance("e1"),
        ...distinctVisits(["d", "e", "f"]),
      ]),
    );
    expect(blocks.some((b) => b.kind === "compact-run")).toBe(false);
    expect(blocks).toHaveLength(7);
  });

  it("counts activity-summary and individual activity rows together toward the threshold", () => {
    const blocks = collapseCompactRuns(
      groupHomeFeedEntries([
        // 3 same-user visits → one activity-summary (counts as one compact row).
        visit({ id: "s1", user_id: "u1" }),
        visit({ id: "s2", user_id: "u1" }),
        visit({ id: "s3", user_id: "u1" }),
        // 4 distinct-user visits → 4 individual compact rows.
        ...distinctVisits(["a", "b", "c", "d"]),
      ]),
    );
    // 1 summary + 4 entries = 5 compact rows → wrapped.
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("compact-run");
    if (blocks[0].kind === "compact-run") {
      expect(blocks[0].items).toHaveLength(5);
      expect(blocks[0].items[0].kind).toBe("activity-summary");
    }
  });

  it("preserves order and passes non-compact blocks through untouched", () => {
    const blocks = collapseCompactRuns(
      groupHomeFeedEntries([
        visit({ id: "review", user_id: "u-review", content: "Great building" }),
        ...distinctVisits(["a", "b", "c", "d", "e"]),
      ]),
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: "item" });
    if (blocks[0].kind === "item") {
      expect(blocks[0].item).toMatchObject({ kind: "entry" });
    }
    expect(blocks[1].kind).toBe("compact-run");
  });
});
