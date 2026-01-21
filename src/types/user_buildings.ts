import { Database } from '../integrations/supabase/types';

export type UserBuilding = Database['public']['Tables']['user_buildings']['Row'];
export type UserBuildingInsert = Database['public']['Tables']['user_buildings']['Insert'];
export type UserBuildingUpdate = Database['public']['Tables']['user_buildings']['Update'];

export type UserBuildingStatus = 'pending' | 'visited';

// Override the generic status string with specific union type
export type UserBuildingWithStatus = Omit<UserBuilding, 'status'> & {
  status: UserBuildingStatus;
};
