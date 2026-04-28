import { ReviewCardFeed, type ReviewCardFeedProps } from "./ReviewCardFeed";

// TODO(Events Phase 4.5 follow-up): When `get_feed` (or merged client feed) surfaces
// recommendation rows that target events, add a card variant with event cover/title
// (building-only cards would otherwise show null media).

export type FeedResolvedEntryProps = ReviewCardFeedProps & {
  /** Legacy prop — card layout no longer alternates by index; accepted for API compatibility. */
  typeBAlternateIndex?: number;
  /** Legacy alias for `typeBAlternateIndex`. */
  index?: number;
};

/** Thin alias for {@link ReviewCardFeed} (legacy import path). */
export function FeedResolvedEntry({
  index: _index,
  typeBAlternateIndex: _typeBAlternateIndex,
  ...rest
}: FeedResolvedEntryProps) {
  return <ReviewCardFeed {...rest} />;
}
