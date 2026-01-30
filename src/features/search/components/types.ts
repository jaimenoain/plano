export interface ArchitectSummary {
  id: string;
  name: string;
}

export interface StyleSummary {
  id: string;
  name: string;
  slug: string;
}

export interface DiscoveryBuilding {
  id: string;
  short_id?: number | null;
  slug?: string | null;
  name: string;
  // This can be a full URL (legacy/external) or a storage path (user uploads).
  // Use getBuildingImageUrl() utility to display it.
  main_image_url?: string | null;
  architects: ArchitectSummary[] | null;
  styles: StyleSummary[] | null;
  year_completed: number | null;
  city: string | null;
  country: string | null;
  location_lat: number;
  location_lng: number;
  // Optional display fields
  distance?: number;
  social_context?: string;
  social_score?: number;
  contact_interactions?: ContactInteraction[];
  contact_raters?: ContactRater[];
  contact_visitors?: ContactRater[];
  visitors?: ContactRater[]; // From RPC
  location_precision?: 'exact' | 'approximate';
  status?: 'Built' | 'Under Construction' | 'Unbuilt' | 'Demolished' | 'Temporary' | null;
  displayProperties?: {
    strokeColor?: string;
    fillColor?: string;
    tooltipText?: string;
  };
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
