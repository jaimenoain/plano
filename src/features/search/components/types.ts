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
}
