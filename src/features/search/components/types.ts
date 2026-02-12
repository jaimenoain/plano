import { CollectionMarkerCategory } from "@/types/collection";

export interface ArchitectSummary {
  id: string;
  name: string;
}

export interface StyleSummary {
  id: string;
  name: string;
  slug: string;
}

export interface DiscoveryBuildingMapPin {
  id: string;
  location_lat: number;
  location_lng: number;
  status?: string | null;
  isCandidate?: boolean;
  color?: string | null;
  // Optional for map pins
  name?: string;
  main_image_url?: string | null;
  location_precision?: 'exact' | 'approximate';
  isDimmed?: boolean;
  isMarker?: boolean;
  social_context?: string | null;
  tier_rank?: string | number | null;
  personal_rating?: number | null;
  personal_status?: string | null;
}

export interface DiscoveryBuilding extends DiscoveryBuildingMapPin {
  short_id?: number | null;
  slug?: string | null;
  name: string; // Required for full building
  // This can be a full URL (legacy/external) or a storage path (user uploads).
  // Use getBuildingImageUrl() utility to display it.
  main_image_url?: string | null;
  architects: ArchitectSummary[] | null;
  styles: StyleSummary[] | null;
  year_completed: number | null;
  city: string | null;
  country: string | null;
  // Optional display fields
  distance?: number;
  social_score?: number;
  contact_interactions?: ContactInteraction[];
  contact_raters?: ContactRater[];
  contact_visitors?: ContactRater[];
  visitors?: ContactRater[]; // From RPC
  status?: 'Built' | 'Under Construction' | 'Unbuilt' | 'Demolished' | 'Temporary' | null;
  markerCategory?: CollectionMarkerCategory;
  notes?: string | null;
  address?: string | null;
}

export interface ContactRater {
  id: string;
  avatar_url: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface ContactInteraction {
  user: ContactRater;
  status: 'visited' | 'pending' | null;
  rating: number | null;
}

export interface LeaderboardBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  visit_count?: number;
  avg_rating?: number;
  rating_count?: number;
}

export interface LeaderboardData {
  most_visited: LeaderboardBuilding[];
  top_rated: LeaderboardBuilding[];
}

// RPC Types for get_map_clusters

export interface ClusterPoint {
  id: string | number; // Unique identifier (RPC returns md5 string)
  lat: number;
  lng: number;
  count: number;
  is_cluster: true;
  expansion_zoom?: number; // Optional zoom level to expand cluster
}

export interface BuildingPoint {
  id: string;
  lat: number;
  lng: number;
  count: number; // Will be 1
  is_cluster: false;
  name: string;
  slug: string;
  image_url: string | null;
  architect_names: string[] | null;
}

export type MapItem = ClusterPoint | BuildingPoint;
