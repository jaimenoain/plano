/**
 * Card system types for feed / review cards (see `docs/ROADMAP.md` Card System Overhaul).
 * `CardSpec` is produced by `resolveCardSpec()` (Phase 1 Task 1.2) from a `FeedReview` and
 * drives layout, imagery, and prominence without coupling components to raw metrics.
 */

/**
 * How many user-attached review images should influence layout density.
 * - `none` — no user images (building-only or text cards).
 * - `single` — one image (hero or single column).
 * - `pair` — two images (side-by-side or small carousel).
 * - `gallery` — three or more images (carousel / mosaic forward).
 */
export type CardImageWeight = "none" | "single" | "pair" | "gallery";

/**
 * Text volume bucket for review body, derived from word-count bands in `resolveCardSpec`.
 * - `none` — empty or whitespace-only body.
 * - `snippet` — short copy (under ~20 words).
 * - `body` — medium copy (under ~150 words).
 * - `essay` — long-form copy (~150+ words).
 */
export type CardTextWeight = "none" | "snippet" | "body" | "essay";

/**
 * Primary arrangement of media vs copy inside the card chrome.
 * - `media-forward` — imagery leads; text is secondary.
 * - `balanced` — media and copy share visual weight.
 * - `text-forward` — copy leads; imagery supports.
 * - `compact-stack` — dense stack for small surfaces or minimal media + text.
 */
export type CardLayout =
  | "media-forward"
  | "balanced"
  | "text-forward"
  | "compact-stack";

/**
 * Whether the card uses baseline feed chrome or an elevated treatment (e.g. high engagement
 * or notable author), used for subtle emphasis in feed surfaces.
 */
export type CardProminence = "standard" | "elevated";

/**
 * Resolved layout contract for a single review card instance. All fields are intended to be
 * pure outputs of `resolveCardSpec(entry)` so UI stays declarative.
 */
export interface CardSpec {
  /** Row / column / stack strategy for this card. */
  layout: CardLayout;
  /** Image count tier from user review images (and optionally video) only. */
  imageWeight: CardImageWeight;
  /** Body length tier from tokenized word count of `entry.content`. */
  textWeight: CardTextWeight;
  /** Standard vs elevated emphasis in the feed grid. */
  prominence: CardProminence;
}
