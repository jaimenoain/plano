import { MAP_MARKER_FILL } from './mapMarkerFills';
import type { PinRank } from '../utils/pinStyling';

export interface RankVisual {
  size: number;
  ringClasses: string;
  classes: string;
  backgroundColor: string;
  zIndex: number;
}

/**
 * The ladder is carried by ring weight and size, not by fill.
 *
 * `#F5F5F5` and `#FFFFFF` are the same colour at 16–30px, so the muted fills the lower
 * ranks used to wear said nothing — and the translucent one said less than nothing on the
 * pale positron basemap. Every face is now opaque, and the four light ranks separate by
 * how dark and how thick their ring is (`border-strong` → `text-secondary` →
 * `text-primary` → `text-primary` 2px), with the top rank inverting to a black face.
 *
 * z values stay under MapMarkers' MAP_MARKER_Z_MAX (38) so the cap never flattens the
 * ladder; hover/selected pins jump to 39, map chrome sits at 40+.
 */
export const PIN_RANK_VISUALS: Record<PinRank, RankVisual> = {
  5: {
    size: 30,
    // The ring inverts with the fill — `border-text-primary` on the black face
    // would be black-on-black.
    ringClasses: 'border-white border-2',
    classes: 'text-brand-primary-foreground',
    backgroundColor: MAP_MARKER_FILL.brandPrimary,
    zIndex: 36,
  },
  4: {
    size: 26,
    ringClasses: 'border-text-primary border-2',
    classes: '',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 32,
  },
  3: {
    size: 22,
    ringClasses: 'border-text-primary border',
    classes: '',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 28,
  },
  2: {
    size: 19,
    ringClasses: 'border-text-secondary border',
    classes: '',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 20,
  },
  1: {
    size: 16,
    ringClasses: 'border-border-strong border',
    classes: '',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 5,
  },
};

// Clusters mirror the pin ladder: a cluster wears a rank's face iff it contains
// at least one building of that rank (max_tier carries the best rank inside).
// One notch heavier at the bottom than the pin ladder — a cluster stands for many
// buildings and always outranks a lone rank-1 pin next to it.
export const CLUSTER_RANK_VISUALS: Record<PinRank, Omit<RankVisual, 'size'>> = {
  5: {
    ringClasses: 'border-white border-2',
    classes: 'font-bold text-white',
    backgroundColor: MAP_MARKER_FILL.brandPrimary,
    zIndex: 36,
  },
  4: {
    ringClasses: 'border-text-primary border-2',
    classes: 'font-bold text-text-primary',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 32,
  },
  3: {
    ringClasses: 'border-text-primary border',
    classes: 'font-bold text-text-primary',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 28,
  },
  2: {
    ringClasses: 'border-text-secondary border',
    classes: 'font-bold text-text-primary',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 20,
  },
  1: {
    ringClasses: 'border-text-secondary border',
    classes: 'font-bold text-text-primary',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 10,
  },
};
