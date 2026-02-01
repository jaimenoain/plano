export interface Collection {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  slug: string;
  show_community_images: boolean;
  categorization_method: 'default' | 'custom' | 'status' | 'rating_member';
  custom_categories: { id: string; label: string; color: string }[] | null;
  categorization_selected_members: string[] | null;
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
