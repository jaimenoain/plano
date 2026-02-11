import { Database } from '@/integrations/supabase/types';
import { Architect } from './architect';
import { TierRank } from './plano-map';

export type BuildingRow = Database['public']['Tables']['buildings']['Row'];

// Extend the existing Building type to include the new admin columns
// These columns are added via migration `update_buildings_schema.sql`
export interface AdminBuilding extends Omit<BuildingRow, 'architects'> {
  is_deleted: boolean;
  is_verified: boolean;
  architects: Architect[] | null;
  popularity_score?: number | null;
  tier_rank?: TierRank | null;
}
