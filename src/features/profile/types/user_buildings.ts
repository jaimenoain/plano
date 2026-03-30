/**
 * `public.user_buildings` row shapes until the table is present in generated `Database` types.
 */
export type UserBuilding = {
  id: string;
  user_id: string;
  building_id: string;
  status: string | null;
  rating?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserBuildingInsert = {
  id?: string;
  user_id: string;
  building_id: string;
  status?: string | null;
  rating?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserBuildingUpdate = Partial<
  Omit<UserBuilding, "id" | "user_id" | "building_id">
> & {
  id?: string;
  user_id?: string;
  building_id?: string;
};

export type UserBuildingStatus = "pending" | "visited";

export type UserBuildingWithStatus = Omit<UserBuilding, "status"> & {
  status: UserBuildingStatus;
};
