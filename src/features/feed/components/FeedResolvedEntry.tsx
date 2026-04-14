import { ReviewCardFeed, type ReviewCardFeedProps } from "./ReviewCardFeed";

// TODO(Events Phase 4.5 follow-up): When `get_feed` (or merged client feed) surfaces
// recommendation rows that target events, add a card variant with event cover/title
// (building-only cards would otherwise show null media).

export type FeedResolvedEntryProps = Omit<ReviewCardFeedProps, "typeBAlternateIndex"> & {
  typeBAlternateIndex?: number;
  /** Legacy alias for {@link ReviewCardFeedProps.typeBAlternateIndex}. */
  index?: number;
};

/** Thin alias for {@link ReviewCardFeed} (legacy import path). */
export function FeedResolvedEntry({
  index,
  typeBAlternateIndex,
  ...rest
}: FeedResolvedEntryProps) {
  const alt = typeBAlternateIndex ?? index ?? 0;
  return <ReviewCardFeed {...rest} typeBAlternateIndex={alt} />;
}
