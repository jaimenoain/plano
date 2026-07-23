import type { ClusterResponse } from '../hooks/useMapData';
import type { MapMode } from '@/types/plano-map';
import { MAP_MARKER_FILL } from '../constants/mapMarkerFills';
import { getConstructionTreatment } from '@/lib/buildingStatus';

/**
 * The 5-rank monochrome ladder. One visual grammar, two data sources, selected
 * by map mode:
 *
 *   Library ("Personal") mode — the user's own award dots:
 *     5 = 3 pts · 4 = 2 pts · 3 = 1 pt · 2 = saved/visited unrated · 1 = unsaved
 *   Discover ("Global") mode — popularity percentile bands:
 *     5 = Top 1% · 4 = Top 5% · 3 = Top 10% · 2 = Top 20% · 1 = Rest
 *
 * Prominence is carried by fill value and size, never hue (markers are
 * monochrome — a lime marker is a bug; see docs/DESIGN_TOKENS.md).
 */
export type PinRank = 1 | 2 | 3 | 4 | 5;
export type PinShape = 'pin' | 'circle';

export interface PinStyle {
  /** Ladder rank; null for the photo-gap and custom-colour overrides. */
  rank: PinRank | null;
  shape: PinShape;
  zIndex: number;
  size: number;
  classes: string;
  backgroundColor?: string;
  /** Personal code only: the user's award dots rendered inside the pin (0 = none). */
  dots: 0 | 1 | 2 | 3;
  /** Global code only: subtle centre dot marking a building in the user's library. */
  savedMark: boolean;
  /** Inline fill for dots / saved mark — inverts on the rank-5 black face. */
  innerMarkColor: string;
  showContent: boolean;
}

export interface PinOptions {
  photographyGaps?: boolean;
  /** 'library' selects the personal code; 'discover'/null/undefined the global code. */
  mode?: MapMode;
}

/**
 * Global percentile label → ladder rank. 'Top 25%' is a retired band (the
 * tiering quota moved to 20%) tolerated for stale caches — a known
 * top-quartile building is far closer to the Top 20% band than to Rest.
 */
export function getGlobalTierRank(label: string | null | undefined): PinRank {
  switch (label) {
    case 'Top 1%':
      return 5;
    case 'Top 5%':
      return 4;
    case 'Top 10%':
      return 3;
    case 'Top 20%':
    case 'Top 25%':
      return 2;
    default:
      return 1;
  }
}

/**
 * Personal rating/status → ladder rank. `status` is the user-library status;
 * the RPC maps `pending` → `saved`, but prop-fed surfaces still pass `pending`.
 */
export function getPersonalTierRank(
  rating: number | null | undefined,
  status: string | null | undefined,
): PinRank {
  const points = rating ?? 0;
  if (points >= 3) return 5;
  if (points === 2) return 4;
  if (points === 1) return 3;
  if (status === 'saved' || status === 'visited' || status === 'pending') return 2;
  return 1;
}

interface RankVisual {
  size: number;
  classes: string;
  backgroundColor: string;
  zIndex: number;
}

// z values stay under MapMarkers' MAP_MARKER_Z_MAX (38) so the cap never
// flattens the ladder; hover/selected pins jump to 39, map chrome sits at 40+.
const PIN_RANK_VISUALS: Record<PinRank, RankVisual> = {
  5: {
    size: 30,
    // The ring inverts with the fill — `border-text-primary` on the black face
    // would be black-on-black.
    classes: 'border-white border-2 text-brand-primary-foreground',
    backgroundColor: MAP_MARKER_FILL.brandPrimary,
    zIndex: 36,
  },
  4: {
    size: 26,
    classes: 'border-text-primary border-2',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 32,
  },
  3: {
    size: 22,
    classes: 'border-border-strong border',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 28,
  },
  2: {
    size: 18,
    classes: 'border-border-strong border',
    backgroundColor: MAP_MARKER_FILL.surfaceMuted,
    zIndex: 20,
  },
  1: {
    size: 14,
    classes: 'border-border-default border',
    backgroundColor: MAP_MARKER_FILL.surfaceMuted80,
    zIndex: 5,
  },
};

// Clusters mirror the pin ladder: a cluster wears a rank's face iff it contains
// at least one building of that rank (max_tier carries the best rank inside).
const CLUSTER_RANK_VISUALS: Record<PinRank, Omit<RankVisual, 'size'>> = {
  5: {
    classes: 'font-bold text-white border-white border-2',
    backgroundColor: MAP_MARKER_FILL.brandPrimary,
    zIndex: 36,
  },
  4: {
    classes: 'font-bold text-black border-text-primary border-2',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 32,
  },
  3: {
    classes: 'font-bold text-black border-border-strong border',
    backgroundColor: MAP_MARKER_FILL.white,
    zIndex: 28,
  },
  2: {
    classes: 'font-bold text-black border-border-strong border',
    backgroundColor: MAP_MARKER_FILL.surfaceMuted,
    zIndex: 20,
  },
  1: {
    classes: 'font-bold text-black border-border-default border',
    backgroundColor: MAP_MARKER_FILL.surfaceMuted80,
    zIndex: 10,
  },
};

/**
 * Overlay a de-emphasized treatment for non-standing / not-yet-standing
 * buildings on top of the computed rank style, so e.g. a Lost building the user
 * rated keeps its rank shape/size but reads as historic. Standing buildings
 * (Built / Temporary / NULL) and clusters are returned unchanged.
 *
 *   lost               → faded ghost pin
 *   unbuilt            → dashed outline (proposed / never realized)
 *   under-construction → dashed outline (in progress)
 */
function applyConstructionTreatment(
  style: PinStyle,
  item: ClusterResponse,
  options?: PinOptions,
): PinStyle {
  if (item.is_cluster || options?.photographyGaps) return style;
  const treatment = getConstructionTreatment(item.construction_status);
  if (!treatment || treatment === 'temporary') return style;
  const modifier =
    treatment === 'lost' ? 'opacity-50' : 'border-dashed';
  return { ...style, classes: `${style.classes} ${modifier}` };
}

export function getPinStyle(item: ClusterResponse, options?: PinOptions): PinStyle {
  return applyConstructionTreatment(getBasePinStyle(item, options), item, options);
}

function isLibraryItem(item: ClusterResponse): boolean {
  return (
    (item.rating ?? 0) > 0 ||
    item.status === 'visited' ||
    item.status === 'saved' ||
    item.status === 'pending'
  );
}

function getBasePinStyle(item: ClusterResponse, options?: PinOptions): PinStyle {
  const shape: PinShape = item.location_approximate ? 'circle' : 'pin';

  if (options?.photographyGaps && !item.is_cluster) {
    // The photography-gap overlay is a data-coverage heatmap, not a place marker —
    // it is the one map layer that stays chromatic. Semantic feedback tokens only.
    const photoCount = item.photos_count ?? 0;
    let backgroundColor: string = MAP_MARKER_FILL.feedbackDestructive; // 0 photos
    if (photoCount >= 3) {
      backgroundColor = MAP_MARKER_FILL.feedbackSuccess; // 3+ photos
    } else if (photoCount > 0) {
      backgroundColor = MAP_MARKER_FILL.feedbackWarning; // 1-2 photos
    }

    return {
      rank: null,
      shape,
      zIndex: 30,
      size: 24,
      classes: 'border-white border-2 shadow-xs',
      backgroundColor,
      dots: 0,
      savedMark: false,
      innerMarkColor: MAP_MARKER_FILL.brandPrimary,
      showContent: true,
    };
  }

  if (item.is_cluster) {
    const size = item.count > 1000 ? 64 : item.count > 100 ? 48 : 32;
    // Clamp tolerates legacy cached max_tier values (the old scale topped out
    // at 4) and future drift.
    const rank = Math.min(5, Math.max(1, item.max_tier ?? 1)) as PinRank;
    const visual = CLUSTER_RANK_VISUALS[rank];

    return {
      rank,
      shape: 'circle',
      zIndex: visual.zIndex,
      size,
      classes: visual.classes,
      backgroundColor: visual.backgroundColor,
      dots: 0,
      savedMark: false,
      innerMarkColor: rank === 5 ? MAP_MARKER_FILL.white : MAP_MARKER_FILL.brandPrimary,
      showContent: true,
    };
  }

  // Custom Category / Member Status colour override
  if (item.color) {
    // The face arrives already resolved on the monochrome ladder (buildings via
    // categorisation; standalone markers via the quiet muted step). Only the solid
    // brand-primary face is dark enough for a white ring + white content; every
    // lighter face needs a dark ring and dark content or it vanishes on the light
    // (positron) basemap — the satellite toggle never changes marker styling.
    const isDarkFace = item.color === MAP_MARKER_FILL.brandPrimary;
    return {
      rank: null,
      shape,
      zIndex: 20,
      size: 28,
      classes: isDarkFace
        ? 'border-white border-2 text-white'
        : 'border-text-primary border-2 text-brand-primary',
      backgroundColor: item.color,
      dots: 0,
      savedMark: false,
      innerMarkColor: isDarkFace ? MAP_MARKER_FILL.white : MAP_MARKER_FILL.brandPrimary,
      showContent: true,
    };
  }

  // Mode selects the code: library → the user's own award dots; anything else
  // (discover, contextless surfaces) → the global percentile bands, with a
  // subtle centre dot marking buildings already in the user's library.
  const personal = options?.mode === 'library';
  const rank = personal
    ? getPersonalTierRank(item.rating, item.status)
    : getGlobalTierRank(item.tier_rank_label);
  const visual = PIN_RANK_VISUALS[rank];

  const dots = personal && rank >= 3 ? ((rank - 2) as 1 | 2 | 3) : 0;
  const savedMark =
    !personal && isLibraryItem(item) && !item.is_candidate && !item.is_custom_marker;

  return {
    rank,
    shape,
    zIndex: visual.zIndex,
    size: visual.size,
    classes: visual.classes,
    backgroundColor: visual.backgroundColor,
    dots,
    savedMark,
    innerMarkColor: rank === 5 ? MAP_MARKER_FILL.white : MAP_MARKER_FILL.brandPrimary,
    showContent: true,
  };
}
