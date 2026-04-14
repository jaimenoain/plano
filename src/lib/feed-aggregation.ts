import { resolveCardType } from "@/features/feed/utils/resolveCardType";
import type { CardType } from "@/types/cards";
import type { FeedEventAttendance, FeedReview } from "@/types/feed";
import { differenceInHours } from "date-fns";

export type RowCell =
  | { type: "compact"; entry: FeedReview; cardType?: CardType }
  | {
      type: "activity";
      entry: FeedReview;
      activityStatus: "visited" | "pending";
      cardType?: CardType;
    };

/**
 * Feed row after `aggregateFeed` / `collapseIntoRows`. Optional `cardType` from {@link resolveCardType}.
 */
export type AggregatedFeedItem =
  | { type: "hero"; entry: FeedReview; cardType?: CardType }
  | { type: "compact"; entry: FeedReview; cardType?: CardType }
  | {
      type: "cluster";
      entries: FeedReview[];
      user: FeedReview["user"];
      location?: string;
      timestamp: string;
      cardType?: CardType;
    }
  | {
      type: "activity";
      entry: FeedReview;
      activityStatus: "visited" | "pending";
      cardType?: CardType;
    }
  | { type: "row"; left: RowCell; right: RowCell; cardType?: CardType };

const getReviewDate = (review: FeedReview) => {
  return review.edited_at ? new Date(review.edited_at) : new Date(review.created_at);
};

/** ISO-ish timestamp for merging attendance rows with aggregated feed order (newest first). */
export function aggregatedItemTime(item: AggregatedFeedItem): string {
  switch (item.type) {
    case "hero":
    case "compact":
    case "activity":
      return item.entry.edited_at ?? item.entry.created_at;
    case "cluster":
      return item.timestamp;
    case "row": {
      const left = item.left.entry.edited_at ?? item.left.entry.created_at;
      const right = item.right.entry.edited_at ?? item.right.entry.created_at;
      return left >= right ? left : right;
    }
  }
}

export type MergedHomeFeedRow =
  | { kind: "aggregated"; item: AggregatedFeedItem }
  | { kind: "event_attendance"; entry: FeedEventAttendance };

/**
 * Interleaves clustered event-attendance cards with aggregated review rows by recency.
 */
export function mergeAggregatedFeedWithEventAttendance(
  items: AggregatedFeedItem[],
  attendance: FeedEventAttendance[],
): MergedHomeFeedRow[] {
  const attSorted = [...attendance].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const out: MergedHomeFeedRow[] = [];
  let i = 0;
  let j = 0;
  while (i < items.length || j < attSorted.length) {
    const aggTime = i < items.length ? aggregatedItemTime(items[i]) : "";
    const attTime = j < attSorted.length ? attSorted[j].createdAt : "";
    if (j >= attSorted.length || (i < items.length && aggTime >= attTime)) {
      out.push({ kind: "aggregated", item: items[i] });
      i += 1;
    } else {
      out.push({ kind: "event_attendance", entry: attSorted[j] });
      j += 1;
    }
  }
  return out;
}

/** Pairs adjacent `compact+compact` into `row` items; activity items stay separate for stream grouping. */
export function collapseIntoRows(items: AggregatedFeedItem[]): AggregatedFeedItem[] {
  const out: AggregatedFeedItem[] = [];
  let i = 0;
  while (i < items.length) {
    const cur = items[i];

    if (cur.type === "hero" || cur.type === "cluster" || cur.type === "row") {
      out.push(cur);
      i += 1;
      continue;
    }

    if (cur.type === "compact") {
      const next = items[i + 1];
      if (next?.type === "compact") {
        out.push({
          type: "row",
          left: {
            type: "compact",
            entry: cur.entry,
            ...(cur.cardType !== undefined ? { cardType: cur.cardType } : {}),
          },
          right: {
            type: "compact",
            entry: next.entry,
            ...(next.cardType !== undefined ? { cardType: next.cardType } : {}),
          },
        });
        i += 2;
      } else {
        out.push(cur);
        i += 1;
      }
      continue;
    }

    if (cur.type === "activity") {
      // Keep each activity item separate so the feed renderer can group consecutive
      // `resolveCardType === "activity"` rows into one `ActivityStreamGroup`.
      out.push(cur);
      i += 1;
      continue;
    }
  }
  return out;
}

export function aggregateFeed(reviews: FeedReview[]): AggregatedFeedItem[] {
  const aggregated: AggregatedFeedItem[] = [];
  let pendingCluster: FeedReview[] = [];

  const flushCluster = () => {
    if (pendingCluster.length === 0) return;

    if (pendingCluster.length < 2) {
      pendingCluster.forEach((entry) => {
        aggregated.push({ type: "compact", entry, cardType: resolveCardType(entry) });
      });
    } else {
      const cities = new Set(
        pendingCluster
          .map((r) =>
            r.building.city ||
            (r.building.address ? r.building.address.split(",").pop()?.trim() : null),
          )
          .filter(Boolean),
      );

      let location: string | undefined = undefined;
      if (cities.size === 1) {
        location = Array.from(cities)[0] as string;
      } else if (cities.size > 1) {
        location = undefined;
      } else {
        location = undefined;
      }

      aggregated.push({
        type: "cluster",
        entries: [...pendingCluster],
        user: pendingCluster[0].user,
        location,
        timestamp: pendingCluster[0].edited_at || pendingCluster[0].created_at,
      });
    }
    pendingCluster = [];
  };

  for (const review of reviews) {
    // Rule 0 — Activity Exemption (before Gold Dust / clustering)
    const noContent = !review.content;
    const noRating = !review.rating;
    const noImages = !review.images || review.images.length === 0;
    const activityStatusOk =
      review.status === "visited" || review.status === "pending";
    const hasBuildingImage = !!(
      review.building.main_image_url ||
      review.building.community_preview_url
    );

    if (noContent && noRating && noImages && activityStatusOk && hasBuildingImage) {
      flushCluster();
      aggregated.push({
        type: "activity",
        entry: review,
        activityStatus: review.status === "visited" ? "visited" : "pending",
        cardType: resolveCardType(review),
      });
      continue;
    }

    const hasUserImages = review.images && review.images.length > 0;

    if (hasUserImages) {
      flushCluster();
      aggregated.push({ type: "hero", entry: review, cardType: resolveCardType(review) });
      continue;
    }

    if (pendingCluster.length > 0) {
      const lastInCluster = pendingCluster[pendingCluster.length - 1];

      const sameUser = review.user_id === lastInCluster.user_id;

      const timeDiff = Math.abs(
        differenceInHours(getReviewDate(review), getReviewDate(lastInCluster)),
      );
      const withinTime = timeDiff < 4;
      const sameStatus = review.status === lastInCluster.status;

      if (sameUser && withinTime && sameStatus) {
        pendingCluster.push(review);
      } else {
        flushCluster();
        pendingCluster.push(review);
      }
    } else {
      pendingCluster.push(review);
    }
  }

  flushCluster();

  return collapseIntoRows(aggregated);
}
