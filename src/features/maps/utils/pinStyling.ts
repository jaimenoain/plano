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

export function getPinStyle(item: ClusterResponse): PinStyle {
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

  // Step 2: Shape Check
  // Default to 'pin'. If item.location_approximate exists in the future, check it here.
  const shape: PinShape = item.location_approximate ? 'circle' : 'pin';

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
    // Context 1: My Library
    if (userRating >= 3) {
      // Tier S (User): Lime Theme
      tier = 'S';
    } else if (userRating === 2) {
      tier = 'A';
    } else if (userRating === 1) {
      tier = 'B';
    } else {
      // Rating 0 or just Saved
      tier = 'C';
    }
  } else {
    // Context 2: Discover (No User Rating)
    const rank = item.tier_rank_label;
    if (rank === 'Top 1%') {
      tier = 'S';
    } else if (rank === 'Top 5%') {
      tier = 'A';
    } else if (rank === 'Top 10%' || rank === 'Top 20%') {
      tier = 'B';
    } else {
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
