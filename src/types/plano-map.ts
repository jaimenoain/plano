
export type MichelinRating = 0 | 1 | 2 | 3;

export type MapMode = 'discover' | 'library';

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
  architects?: { id: string; name: string }[];

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

  // Collections
  collections?: { id: string; name: string }[];
  collectionIds?: string[];
}

export interface MapState {
  lat: number;
  lng: number;
  zoom: number;
  mode: MapMode;
  filters: MapFilters;
}
