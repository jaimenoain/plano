export interface Collection {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  external_link: string | null;
  slug: string;
  show_community_images: boolean;
  show_added_by: boolean;
  categorization_method: 'default' | 'custom' | 'status' | 'rating_member' | 'uniform';
  custom_categories: { id: string; label: string; color: string }[] | null;
  categorization_selected_members: string[] | null;
  itinerary: Itinerary | null;
}

/** Which saved-place suggestions appear on the collection map (by personal dot rating on user_buildings). */
export type SavedPlacesDotFilter = 'all' | '1' | '2' | '3';

/** Filter saved-place suggestions by library status (`user_buildings.status`: visited vs bucket list / pending). */
export type SavedPlacesStatusFilter = 'all' | 'visited' | 'pending';

export type TransportMode = 'walking' | 'driving' | 'cycling' | 'transit';

export interface ItineraryRoute {
  dayNumber: number;
  buildingIds: string[];
  routeGeometry?: unknown; // GeoJSON LineString
  isFallback?: boolean;
}

export interface ItineraryStop {
  id: string;
  referenceId: string;
  type: 'building' | 'marker';
  transitToNext?: {
    mode: TransportMode;
    customInstructions: string | null;
    estimatedMinutes: number | null;
  };
}

export interface ItineraryDay {
  dayNumber: number;
  title?: string;
  description?: string;
  stops: ItineraryStop[];
  defaultTransportMode: TransportMode;
  routeGeometry?: unknown; // GeoJSON LineString
  isFallback?: boolean;
}

export interface Itinerary {
  days: number;
  defaultTransportMode: TransportMode;
  routes: ItineraryDay[];
}

export interface CollectionItemWithBuilding {
  id: string;
  building_id: string;
  note: string | null;
  custom_category_id: string | null;
  is_hidden?: boolean;
  /** User who added this building to the collection (null for pre-attribution rows;
   *  omitted for synthetic itinerary items that never carry attribution). */
  added_by?: string | null;
  /** Resolved profile for `added_by`, used to render "Added by @username". */
  added_by_user?: { id: string; username: string } | null;
  building: {
    id: string;
    name: string;
    address?: string | null;
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
    winner_award_name?: string | null;
    building_credits?: {
      credit_tier: string | null;
      status: string | null;
      person: { id: string; name: string } | null;
      company: { id: string; name: string } | null;
    }[];
  };
}

export type CollectionMarkerCategory = 'accommodation' | 'dining' | 'transport' | 'attraction' | 'other';

export interface CollectionMarker {
  id: string;
  collection_id: string;
  google_place_id: string | null;
  /** Google Places primary type (lowercase), e.g. `bakery`. Drives map/list icons; `category` stays the coarse bucket. */
  google_primary_type?: string | null;
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
