/**
 * High-level feed card taxonomy (see `docs/Roadmap.md` Card System Overhaul).
 * Resolved via {@link resolveCardType} in `src/features/feed/utils/resolveCardType.ts`.
 */

export type CardType = "A" | "B" | "C" | "activity";

/** Alias for feed card taxonomy (same values as {@link CardType}). */
export type FeedCardType = CardType;

/** Detail page review card copy tier (see Roadmap Task 3.3 — brief §4.4). */
export type DetailCardTextTreatment = "none" | "quote" | "body";

/**
 * Layout variant for building-detail review cards.
 * Resolved via {@link resolveDetailVariant} in `src/features/feed/utils/resolveCardType.ts`.
 */
export interface DetailCardVariant {
  hasMedia: boolean;
  /** Usable review images (valid URLs) plus one if `video_url` is present. */
  mediaCount: number;
  textTreatment: DetailCardTextTreatment;
  /** Primary media column height (px) for the detail card first row. */
  photoColHeight: 260 | 300 | 400;
}
