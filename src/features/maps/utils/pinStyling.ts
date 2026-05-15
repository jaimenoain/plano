import { ClusterResponse } from '../hooks/useMapData';
import { MAP_MARKER_FILL } from '../constants/mapMarkerFills';

export type PinTier = 'S' | 'A' | 'B' | 'C' | 'Cluster';
export type PinShape = 'pin' | 'circle';

export interface PinStyle {
  tier: PinTier;
  shape: PinShape;
  zIndex: number;
  size: number;
  classes: string;
  showDot: boolean;
  showContent: boolean;
  backgroundColor?: string;
}

export interface PinOptions {
  photographyGaps?: boolean;
}

export function getPinStyle(item: ClusterResponse, options?: PinOptions): PinStyle {
  // Step 0: Gap Layer Check (Phase 2)
  const shape: PinShape = item.location_approximate ? 'circle' : 'pin';

  if (options?.photographyGaps && !item.is_cluster) {
    const photoCount = item.photos_count ?? 0;
    let backgroundColor = "#EF4444"; // Red (0 photos)
    if (photoCount >= 3) {
      backgroundColor = "#10B981"; // Green (3+ photos)
    } else if (photoCount > 0) {
      backgroundColor = "#F59E0B"; // Amber (1-2 photos)
    }

    return {
      tier: 'C',
      shape,
      zIndex: 30,
      size: 24,
      classes: 'border-white border-2 shadow-sm',
      backgroundColor,
      showDot: false,
      showContent: true,
    };
  }

  // Step 1: Cluster Check
  if (item.is_cluster) {
    const size = item.count > 1000 ? 64 : item.count > 100 ? 48 : 32;

    // Smart Clusters logic based on max_tier
    let classes = 'text-black font-bold';
    let zIndex = 10;

    let backgroundColor: string;
    if (item.max_tier === 3) {
      // Tier 3: Solid brand-secondary face (inline fill — reliable inside map canvas)
      classes += ' border-brand-primary border-2';
      zIndex = 20;
      backgroundColor = MAP_MARKER_FILL.brandSecondary;
    } else if (item.max_tier === 2) {
      classes += ' border-white border-2';
      zIndex = 20;
      backgroundColor = MAP_MARKER_FILL.white;
    } else {
      classes += ' border-gray-600 border';
      zIndex = 10;
      backgroundColor = MAP_MARKER_FILL.surfaceMuted;
    }

    return {
      tier: 'Cluster',
      shape: 'circle',
      zIndex,
      size,
      classes,
      backgroundColor,
      showDot: false,
      showContent: true
    };
  }

  // Step 2b: Color Override (Custom Category / Member Status)
  if (item.color) {
    return {
      tier: 'C',
      shape,
      zIndex: 20,
      size: 28,
      classes: 'border-white border-2 text-black',
      backgroundColor: item.color,
      showDot: false,
      showContent: true,
    };
  }

  // Step 3: Tier Logic
  let tier: PinTier = 'C';

  // Determine context: Library (User Rating/Status) vs Discover (Global Rank)
  const userRating = item.rating ?? 0;
  // Check if item is in library (rated > 0, or explicitly saved/visited)
  const isLibraryItem = userRating > 0 || item.status === 'visited' || item.status === 'saved' || item.status === 'pending';

  if (isLibraryItem) {
    // My Library — Michelin dots → pin tiers (most → least prominent): 3 / 2 / 1 / Rest
    if (userRating >= 3) {
      tier = 'S';
    } else if (userRating === 2) {
      tier = 'A';
    } else if (userRating === 1) {
      tier = 'B';
    } else {
      tier = 'C';
    }
  } else {
    // Context 2: Discover — global percentile bands (most → least prominent)
    const rank = item.tier_rank_label;
    if (rank === 'Top 1%') {
      tier = 'S';
    } else if (rank === 'Top 5%') {
      tier = 'A';
    } else if (rank === 'Top 20%' || rank === 'Top 10%') {
      // Third prominence band; DB may still use legacy `Top 10%` between 5% and 20%
      tier = 'B';
    } else {
      // Standard, Top 25%, unknown — Rest
      tier = 'C';
    }
  }

  // Step 4: Map Tiers to Visuals
  switch (tier) {
    case 'S':
      return {
        tier,
        shape,
        zIndex: 100,
        size: 30,
        classes: 'border-text-primary border-2 text-brand-primary-foreground',
        backgroundColor: MAP_MARKER_FILL.brandPrimary,
        showDot: false,
        showContent: true,
      };
    case 'A':
      return {
        tier,
        shape,
        zIndex: 100,
        size: 30,
        classes: 'border-text-primary border-2',
        backgroundColor: MAP_MARKER_FILL.white,
        showDot: false,
        showContent: true,
      };
    case 'B':
      return {
        tier,
        shape,
        zIndex: 20,
        size: 20,
        classes: 'border-gray-600 border',
        backgroundColor: MAP_MARKER_FILL.white,
        showDot: false,
        showContent: true,
      };
    case 'C':
    default:
      return {
        tier,
        shape,
        zIndex: 5,
        size: 20,
        classes: 'border-gray-600 border',
        backgroundColor: MAP_MARKER_FILL.surfaceMuted80,
        showDot: false,
        showContent: true,
      };
  }
}
