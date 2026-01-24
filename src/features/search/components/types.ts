export interface DiscoveryBuilding {
  id: string;
  name: string;
  main_image_url: string | null;
  architects: string[] | null;
  year_completed: number | null;
  city: string | null;
  country: string | null;
  location_lat: number;
  location_lng: number;
  // Optional display fields
  distance?: number;
  social_context?: string;
  social_score?: number;
  contact_raters?: ContactRater[];
}

export interface ContactRater {
  id: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface LeaderboardBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  main_image_url: string | null;
  visit_count?: number;
  avg_rating?: number;
  rating_count?: number;
}

export interface LeaderboardData {
  most_visited: LeaderboardBuilding[];
  top_rated: LeaderboardBuilding[];
}
