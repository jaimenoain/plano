export interface Collection {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  slug: string;
}

export interface CollectionItemWithBuilding {
  id: string;
  building_id: string;
  note: string | null;
  building: {
    id: string;
    name: string;
    location_lat: number;
    location_lng: number;
    city: string | null;
    country: string | null;
    year_completed: number | null;
    hero_image_url: string | null;
    location_precision: "exact" | "approximate";
  };
}
