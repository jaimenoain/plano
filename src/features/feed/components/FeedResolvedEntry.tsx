import { ReviewCardFeed, type ReviewCardFeedProps } from "./ReviewCardFeed";

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
