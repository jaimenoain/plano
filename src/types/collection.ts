export interface Collection {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  external_link: string | null;
  slug: string;
  show_community_images: boolean;
  categorization_method: 'default' | 'custom' | 'status' | 'rating_member' | 'uniform';
  custom_categories: { id: string; label: string; color: string }[] | null;
  categorization_selected_members: string[] | null;
  itinerary: Itinerary | null;
}

export type TransportMode = 'walking' | 'driving' | 'cycling' | 'transit';

export interface ItineraryRoute {
  dayNumber: number;
  buildingIds: string[];
  routeGeometry?: any; // GeoJSON LineString
  isFallback?: boolean;
}

export interface Itinerary {
  days: number;
  transportMode: TransportMode;
  routes: ItineraryRoute[];
}

export interface CollectionItemWithBuilding {
  id: string;
  building_id: string;
  note: string | null;
  custom_category_id: string | null;
  is_hidden?: boolean;
  building: {
    id: string;
    name: string;
    location_lat: number;
    location_lng: number;
    city: string | null;
    country: string | null;
    slug?: string | null;
    short_id?: number | null;
    year_completed: number | null;
    hero_image_url: string | null;
    community_preview_url: string | null;
    location_precision: "exact" | "approximate";
    building_architects?: {
      architects: {
        id: string;
        name: string;
      } | null;
    }[];
  };
}

export type CollectionMarkerCategory = 'accommodation' | 'dining' | 'transport' | 'attraction' | 'other';

export interface CollectionMarker {
  id: string;
  collection_id: string;
  google_place_id: string | null;
  name: string;
  category: CollectionMarkerCategory;
  lat: number;
  lng: number;
  address: string | null;
  notes: string | null;
  website: string | null;
  created_at: string;
  created_by: string;
}

export interface UserFolder {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  items_count?: number;
  preview_images?: string[];
}

export interface UserFolderItem {
  folder_id: string;
  collection_id: string;
  created_at: string;
  collection?: Collection;
}
