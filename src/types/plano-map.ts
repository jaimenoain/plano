
export type MichelinRating = 0 | 1 | 2 | 3;

export type MapMode = 'discover' | 'library' | null;

// RPC Types for get_map_clusters
export interface ClusterPoint {
  id: string | number; // Unique identifier (RPC returns md5 string)
  lat: number;
  lng: number;
  count: number;
  is_cluster: true;
  expansion_zoom?: number; // Optional zoom level to expand cluster
}

export type TierRank = 'Top 1%' | 'Top 5%' | 'Top 10%' | 'Top 20%' | 'Standard';

export interface BuildingPoint {
  id: string;
  lat: number;
  lng: number;
  count: 1; // Always 1
  is_cluster: false;
  name: string;
  slug: string;
  image_url: string | null;
  architect_names: string[] | null;
  popularity_score?: number | null;
  tier_rank?: TierRank | null;
  winner_award_name?: string | null;
}

export type MapItem = ClusterPoint | BuildingPoint;

export interface MapFilters {
  // Search
  query?: string;

  // Taxonomy
  category?: string;
  typologies?: string[];
  materials?: string[];
  styles?: string[];
  contexts?: string[];
  attributes?: string[];
  /** Filter map RPC by credited person or company UUIDs */
  people?: { id: string; name: string }[];

  // User Data / Social
  status?: string[];
  hideVisited?: boolean;
  hideSaved?: boolean;
  hideHidden?: boolean;
  hideWithoutImages?: boolean;

  // Ratings & Contacts
  minRating?: MichelinRating;
  personalMinRating?: number;
  contactMinRating?: MichelinRating;
  filterContacts?: boolean;
  ratedBy?: string[];
  contacts?: { id: string; name: string; avatar_url?: string | null }[];

  // Collections
  collections?: { id: string; name: string }[];
  collectionIds?: string[];

  // Folders
  folderIds?: string[];

  // Access
  accessLevels?: string[];
  accessLogistics?: string[];
  accessCosts?: string[];

  /**
   * When true, surfaces lost (no longer standing) buildings in Browse mode.
   * Acts as a quick-access shortcut on top of the explicit `constructionStatuses`
   * filter; if `constructionStatuses` is set, that takes precedence.
   */
  showLost?: boolean;
  /** Building status multi-select (Built, Under Construction, Unbuilt, Temporary, Lost). */
  constructionStatuses?: string[];

  /** Map / list RPC: `building_credits` with this `company_id`, excluding hidden credits */
  creditCompany?: { id: string; name: string } | null;
  /** Map / list RPC: `building_credits.role` in this set, excluding hidden credits */
  creditRoles?: string[];

  // Awards
  awardId?: string;
  awardOutcome?: string;
  awardYearFrom?: number;
  awardYearTo?: number;

  // Size
  sizeCategories?: string[];
  minSizeSqm?: number;
  maxSizeSqm?: number;
  minStoreys?: number;
  maxStoreys?: number;

  /**
   * Century filter (OR). Positive integers match `buildings.century`.
   * `0` means include B.C. buildings (`century < 1`).
   */
  centuries?: number[];

  // Photography Gaps (Phase 2)
  photographyGaps?: boolean;
  gapPhotoCounts?: number[];
}

export interface MapState {
  lat: number;
  lng: number;
  zoom: number;
  mode: MapMode;
  filters: MapFilters;
}
