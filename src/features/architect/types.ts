export interface Architect {
  id: string;
  name: string;
}

export interface ArchitectBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  main_image_url?: string | null;
}
