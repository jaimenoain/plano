import { FeedReview } from "@/types/feed";
import type { CardSpec } from "@/types/cards";
import { differenceInHours } from "date-fns";

export type RowCell =
  | { type: "compact"; entry: FeedReview }
  | {
      type: "activity";
      entry: FeedReview;
      activityStatus: "visited" | "pending";
    };

/**
 * Feed row after `aggregateFeed` / `collapseIntoRows`. Optional `spec` is reserved for
 * attaching a resolved `CardSpec` when the pipeline computes it (non-breaking until wired).
 */
export type AggregatedFeedItem =
  | { type: "hero"; entry: FeedReview; spec?: CardSpec }
  | { type: "compact"; entry: FeedReview; spec?: CardSpec }
  | {
      type: "cluster";
      entries: FeedReview[];
      user: FeedReview["user"];
      location?: string;
      timestamp: string;
      spec?: CardSpec;
    }
  | {
      type: "activity";
      entry: FeedReview;
      activityStatus: "visited" | "pending";
      spec?: CardSpec;
    }
  | { type: "row"; left: RowCell; right: RowCell; spec?: CardSpec };

const getReviewDate = (review: FeedReview) => {
  return review.edited_at ? new Date(review.edited_at) : new Date(review.created_at);
};

/** Pairs adjacent `compact+compact` or `activity+activity` into `row` items; never pairs across other types. */
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
          left: { type: "compact", entry: cur.entry },
          right: { type: "compact", entry: next.entry },
        });
        i += 2;
      } else {
        out.push(cur);
        i += 1;
      }
      continue;
    }

    if (cur.type === "activity") {
      const next = items[i + 1];
      if (next?.type === "activity") {
        out.push({
          type: "row",
          left: {
            type: "activity",
            entry: cur.entry,
            activityStatus: cur.activityStatus,
          },
          right: {
            type: "activity",
            entry: next.entry,
            activityStatus: next.activityStatus,
          },
        });
        i += 2;
      } else {
        out.push(cur);
        i += 1;
      }
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
        aggregated.push({ type: "compact", entry });
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
      });
      continue;
    }

    const hasUserImages = review.images && review.images.length > 0;

    if (hasUserImages) {
      flushCluster();
      aggregated.push({ type: "hero", entry: review });
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
