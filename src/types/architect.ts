export interface Architect {
  id: string;
  name: string;
}

export interface ArchitectBuilding {
  id: string;
  name: string;
  main_image_url: string | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
}
