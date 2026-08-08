import type { ClusterResponse } from '../hooks/useMapData';
import type { MapMode } from '@/types/plano-map';
import { MAP_MARKER_FILL, ghostFill } from '../constants/mapMarkerFills';
import { PIN_RANK_VISUALS, CLUSTER_RANK_VISUALS } from '../constants/pinRankVisuals';
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
  /**
   * Ring utilities only, kept apart from `classes` so a treatment can REPLACE the ring
   * instead of appending to it. Tailwind resolves conflicting utilities by stylesheet
   * order, never by the order they appear in the class attribute, so appending
   * `border-dashed border-2` to a rank's own `border` is a coin toss.
   */
  ringClasses: string;
  /** Everything that is not the ring: content colour, weight, size. */
  classes: string;
  backgroundColor?: string;
  /**
   * Applied inline; 1 = fully opaque. De-emphasis lives here rather than in an
   * `opacity-*` class so treatments compose by multiplication instead of racing each
   * other in the stylesheet (a lost discovery pin used to carry both `opacity-50` and
   * `opacity-60`, with the winner decided by Tailwind's own rule order).
   */
  opacity: number;
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

/**
 * Relative luminance (WCAG formula) of an opaque `#rrggbb` hex colour, used to
 * pick ring/content polarity for an arbitrary member-chosen colour (ADR 0033).
 * Malformed input reads as light (dark ring), the safer default on the pale
 * positron basemap.
 */
export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 1;
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(match[1].slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Below this luminance a face is dark enough for a white ring + white content. */
const DARK_FACE_LUMINANCE_THRESHOLD = 0.35;

export function isDarkFill(color: string): boolean {
  return relativeLuminance(color) < DARK_FACE_LUMINANCE_THRESHOLD;
}

// A colour-override face (custom category / member status / a member's own hue,
// ADR 0033) doesn't carry a ladder rank of its own — it's a bespoke style. This
// maps its resolved fill back onto the ladder so a cluster aggregating such pins
// can still report a meaningful max_tier. Sized faces (marker_styles set a size
// token) rank by size, the visual weight the owner actually chose; sizeless faces
// (the pre-5.8 system overrides: custom category before this task, member
// status, standalone markers) fall back to the original hue-based mapping so
// their cluster behaviour is unchanged.
function colorOverrideRank(color: string, size?: MarkerSizeToken): PinRank {
  if (size === 'lg') return 5;
  if (size === 'md') return 3;
  if (size === 'sm') return 2;
  if (color === MAP_MARKER_FILL.brandPrimary) return 5;
  if (color === MAP_MARKER_FILL.white) return 3;
  return 2;
}

/** Named marker-size steps a collection owner can pick per categorization bucket
 *  (ADR 0033). Mirrors `MarkerSizeToken` in `src/features/collections/markerStyles.ts`
 *  — duplicated rather than imported so `src/features/maps/**` never depends on
 *  `src/features/collections/**`. */
export type MarkerSizeToken = 'sm' | 'md' | 'lg';

/** Pixel size for each token; `lg` matches the size the colour-override branch has
 *  always hardcoded, so an item with no size set renders unchanged. */
const MARKER_SIZE_PX: Record<MarkerSizeToken, number> = { sm: 20, md: 24, lg: 28 };

/** The subset of a point's fields the ladder rank actually depends on. */
export type PinRankInput = Pick<
  ClusterResponse,
  | 'rating'
  | 'status'
  | 'tier_rank_label'
  | 'color'
  | 'marker_size'
  | 'itinerary_sequence'
  | 'itinerary_day_index'
>;

/**
 * The ladder rank a point's own face would express, independent of whether it is
 * rendered directly or folded into a cluster aggregate. Used both by getBasePinStyle
 * (to style an individual pin) and by client-side cluster builders (to compute
 * max_tier), so a cluster can never disagree with the pins it contains.
 */
export function getEffectivePinRank(item: PinRankInput, options?: PinOptions): PinRank {
  if (item.itinerary_sequence !== undefined && item.itinerary_day_index !== undefined) {
    return 5;
  }
  if (item.color) {
    return colorOverrideRank(item.color, item.marker_size as MarkerSizeToken | undefined);
  }
  const personal = options?.mode === 'library';
  return personal
    ? getPersonalTierRank(item.rating, item.status)
    : getGlobalTierRank(item.tier_rank_label);
}

/**
 * The count label, sized to the disc that holds it. It carried no font-size at all before,
 * so a four-digit count inherited whatever the ambient page size happened to be.
 */
function getClusterLabelClasses(size: number): string {
  const scale = size >= 64 ? 'text-sm' : size >= 48 ? 'text-xs' : 'text-2xs';
  return `${scale} leading-none tabular-nums`;
}

/**
 * Overlay a de-emphasized treatment for non-standing / not-yet-standing
 * buildings on top of the computed rank style, so e.g. a Lost building the user
 * rated keeps its rank shape/size but reads as historic. Standing buildings
 * (Built / Temporary / NULL) and clusters are returned unchanged.
 *
 *   lost               → ghost face: the FILL fades, the ring and marks do not
 *   unbuilt            → dashed outline (proposed / never realized)
 *   under-construction → dashed outline (in progress)
 *
 * Both treatments used to be a class appended to the rank's own: `opacity-50` took the
 * ring, dots and icon down with the face until a lost rank-1 pin was gone from the map,
 * and a `border-dashed` appended to a 1px hairline dashed a line nobody could see. The
 * ghost now fades only the fill, and the dash brings its own 2px dark ring.
 */
export function withConstructionTreatment(
  style: PinStyle,
  item: ClusterResponse,
  options?: PinOptions,
): PinStyle {
  if (item.is_cluster || options?.photographyGaps) return style;
  const treatment = getConstructionTreatment(item.construction_status);
  if (!treatment || treatment === 'temporary') return style;
  if (treatment === 'lost') {
    return style.backgroundColor
      ? { ...style, backgroundColor: ghostFill(style.backgroundColor) }
      : style;
  }
  // The dash needs 2px to read at all, and the ring keeps whichever polarity the face
  // already chose — a dark ring on the black rank-5 (or itinerary) face would be invisible.
  const ringColor = style.ringClasses.includes('border-white')
    ? 'border-white'
    : 'border-text-primary';
  return { ...style, ringClasses: `${ringColor} border-2 border-dashed` };
}

/**
 * De-emphasize the collection map's discovery layer. These are buildings the
 * collection does *not* contain, drawn only so an editor can find and add them,
 * so they must never read as members: faded, no library marks, and squashed
 * below the whole pin ladder (rank 1 sits at z=5) so a collection pin always
 * wins an overlap. The squash is proportional, keeping discovery pins ordered
 * among themselves.
 */
function applyDiscoveryTreatment(style: PinStyle, item: ClusterResponse): PinStyle {
  if (!item.is_discovery) return style;
  return {
    ...style,
    zIndex: Math.max(1, Math.round(style.zIndex / 10)),
    opacity: style.opacity * 0.6,
    dots: 0,
    savedMark: false,
  };
}

export function getPinStyle(item: ClusterResponse, options?: PinOptions): PinStyle {
  const style = withConstructionTreatment(getBasePinStyle(item, options), item, options);
  return applyDiscoveryTreatment(style, item);
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
      ringClasses: 'border-white border-2',
      classes: '',
      backgroundColor,
      opacity: 1,
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
      ringClasses: visual.ringClasses,
      classes: `${visual.classes} ${getClusterLabelClasses(size)}`,
      backgroundColor: visual.backgroundColor,
      opacity: 1,
      dots: 0,
      savedMark: false,
      innerMarkColor: rank === 5 ? MAP_MARKER_FILL.white : MAP_MARKER_FILL.brandPrimary,
      showContent: true,
    };
  }

  // Custom Category / Member Status / collection-owner colour override (ADR 0033)
  if (item.color) {
    // The face arrives resolved: either a step on the monochrome ladder (system
    // overrides — buildings via categorisation; standalone markers via the quiet
    // muted step) or an arbitrary member-chosen hex (marker_styles). Ring/content
    // polarity is computed from luminance rather than equality against the three
    // known system fills, so it works for both: only a dark-enough face is dark
    // enough for a white ring + white content, or it vanishes on the light
    // (positron) basemap — the satellite toggle never changes marker styling.
    const isDarkFace = isDarkFill(item.color);
    const markerSize = item.marker_size as MarkerSizeToken | undefined;
    return {
      rank: null,
      shape,
      zIndex: 20,
      size: markerSize ? MARKER_SIZE_PX[markerSize] : 28,
      ringClasses: isDarkFace ? 'border-white border-2' : 'border-text-primary border-2',
      classes: isDarkFace ? 'text-white' : 'text-brand-primary',
      backgroundColor: item.color,
      opacity: 1,
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
  const rank = getEffectivePinRank(item, options);
  const visual = PIN_RANK_VISUALS[rank];

  const dots = personal && rank >= 3 ? ((rank - 2) as 1 | 2 | 3) : 0;
  const savedMark =
    !personal && isLibraryItem(item) && !item.is_candidate && !item.is_custom_marker;

  return {
    rank,
    shape,
    zIndex: visual.zIndex,
    size: visual.size,
    ringClasses: visual.ringClasses,
    classes: visual.classes,
    backgroundColor: visual.backgroundColor,
    opacity: 1,
    dots,
    savedMark,
    innerMarkColor: rank === 5 ? MAP_MARKER_FILL.white : MAP_MARKER_FILL.brandPrimary,
    showContent: true,
  };
}
