import { Database } from '@/integrations/supabase/types';
import { Architect } from './architect';

export type BuildingRow = Database['public']['Tables']['buildings']['Row'];

// Extend the existing Building type to include the new admin columns
// These columns are added via migration `update_buildings_schema.sql`
export interface AdminBuilding extends Omit<BuildingRow, 'architects'> {
  is_deleted: boolean;
  is_verified: boolean;
  hero_image_url?: string | null;
  architects: Architect[] | null;
}
