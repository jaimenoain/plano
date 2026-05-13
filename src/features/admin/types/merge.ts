export type EntityType = "building" | "person" | "company" | "locality";

export interface MergeEntity {
  id: string;
  name: string;
  type: EntityType;
  // Common metadata for display
  subtitle?: string;
  image_url?: string | null;
  is_verified?: boolean;
  // Raw row data
  raw: any;
}
