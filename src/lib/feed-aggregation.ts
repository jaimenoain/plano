import { FeedReview } from "@/types/feed";
import { differenceInHours } from "date-fns";

export type AggregatedFeedItem =
  | { type: 'hero'; entry: FeedReview }
  | { type: 'compact'; entry: FeedReview }
  | { type: 'cluster'; entries: FeedReview[]; user: FeedReview['user']; location?: string; timestamp: string };

const getReviewDate = (review: FeedReview) => {
  return review.edited_at ? new Date(review.edited_at) : new Date(review.created_at);
};

export function aggregateFeed(reviews: FeedReview[]): AggregatedFeedItem[] {
  const aggregated: AggregatedFeedItem[] = [];
  let pendingCluster: FeedReview[] = [];

  const flushCluster = () => {
    if (pendingCluster.length === 0) return;

    if (pendingCluster.length < 4) {
      pendingCluster.forEach(entry => {
        aggregated.push({ type: 'compact', entry });
      });
    } else {
      // Check for location consistency
      // We look at the city of the buildings.
      // If all valid cities are the same, use that city.
      // If mixed, use undefined.

      const cities = new Set(
        pendingCluster
          .map(r => r.building.city || (r.building.address ? r.building.address.split(',').pop()?.trim() : null))
          .filter(Boolean)
      );

      let location: string | undefined = undefined;
      if (cities.size === 1) {
        location = Array.from(cities)[0] as string;
      } else if (cities.size > 1) {
          // Mixed locations
          location = undefined;
      } else {
          // No location data
          location = undefined;
      }

      aggregated.push({
        type: 'cluster',
        entries: [...pendingCluster],
        user: pendingCluster[0].user,
        location,
        timestamp: pendingCluster[0].edited_at || pendingCluster[0].created_at // Use the most recent timestamp (assuming sort desc)
      });
    }
    pendingCluster = [];
  };

  for (const review of reviews) {
    // Rule A: Gold Dust Exemption
    // If user uploaded images, it is NEVER aggregated.
    // Check if review has images AND they are not just stock images (logic is handled in Index.tsx data mapping,
    // but here we check review.images array which contains user uploads).
    const hasUserImages = review.images && review.images.length > 0;

    if (hasUserImages) {
      // Flush any pending cluster first
      flushCluster();
      aggregated.push({ type: 'hero', entry: review });
      continue;
    }

    // Rule B: Clustering
    // Check if matches pending cluster
    if (pendingCluster.length > 0) {
      const lastInCluster = pendingCluster[pendingCluster.length - 1];

      // Check User
      const sameUser = review.user_id === lastInCluster.user_id; // Using user_id is safer than username

      // Check Time (within 4 hours of the *previous* item in the cluster, chaining them)
      // Assuming reviews are sorted DESC (newest first).
      // So 'review' is OLDER than 'lastInCluster'.
      // differenceInHours(earlier, later) returns negative?
      // differenceInHours(dateLeft, dateRight) -> number of hours
      // We want absolute difference.

      const timeDiff = Math.abs(differenceInHours(getReviewDate(review), getReviewDate(lastInCluster)));
      const withinTime = timeDiff < 4;

      if (sameUser && withinTime) {
        pendingCluster.push(review);
      } else {
        flushCluster();
        pendingCluster.push(review);
      }
    } else {
      pendingCluster.push(review);
    }
  }

  // Final flush
  flushCluster();

  return aggregated;
}
