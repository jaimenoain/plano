import { ClusterResponse } from '../hooks/useMapData';

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
}

export function getPinStyle(item: ClusterResponse): PinStyle {
  // Step 1: Cluster Check
  if (item.is_cluster) {
    const size = item.count > 1000 ? 64 : item.count > 100 ? 48 : 32;
    return {
      tier: 'Cluster',
      shape: 'circle',
      zIndex: 10,
      size,
      classes: 'bg-primary text-primary-foreground font-bold',
      showDot: false,
      showContent: true
    };
  }

  // Step 2: Shape Check
  // Default to 'pin'. If item.location_approximate exists in the future, check it here.
  const shape: PinShape = 'pin';

  // Step 3: Tier Logic
  let tier: PinTier = 'C';

  // Determine context: Library (User Rating/Status) vs Discover (Global Rank)
  const userRating = item.rating ?? 0;
  // Check if item is in library (rated > 0, or explicitly saved/visited)
  const isLibraryItem = userRating > 0 || item.status === 'visited' || item.status === 'saved';

  if (isLibraryItem) {
    // Context 1: My Library
    if (userRating >= 3) {
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
    const rank = item.tier_rank;
    if (rank === 'Top 1%') {
      tier = 'S';
    } else if (rank === 'Top 5%' || rank === 'Top 10%') {
      tier = 'A';
    } else if (rank === 'Top 20%') {
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
        size: 44,
        classes: 'bg-lime-high border-foreground border-2 text-black',
        showDot: false,
        showContent: true
      };
    case 'A':
      return {
        tier,
        shape,
        zIndex: 50,
        size: 36,
        classes: 'bg-white border-foreground border-2',
        showDot: true,
        showContent: true
      };
    case 'B':
      return {
        tier,
        shape,
        zIndex: 20,
        size: 28,
        classes: 'bg-muted-foreground border-white border',
        showDot: false,
        showContent: true
      };
    case 'C':
    default:
      return {
        tier,
        shape,
        zIndex: 5,
        size: 20,
        classes: 'bg-muted/80 border-white/50 border',
        showDot: false,
        showContent: true
      };
  }
}
