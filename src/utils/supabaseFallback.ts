import { supabase } from "@/integrations/supabase/client";
import { DiscoveryBuilding, DiscoveryBuildingMapPin, LeaderboardData } from "@/features/search/components/types";

export const searchBuildingsRpc = async (params: {
  query_text: string | null;
  location_coordinates?: { lat: number; lng: number };
  radius_meters?: number;
  filters?: {
    cities?: string[];
    styles?: string[];
    architects?: string[];
    category_id?: string;
    typology_ids?: string[];
    attribute_ids?: string[];
  };
  sort_by?: 'distance' | 'relevance';
  p_limit?: number;
}): Promise<DiscoveryBuilding[]> => {
  const { data, error } = await supabase.rpc('search_buildings', params);
  if (error) throw error;
  return data as DiscoveryBuilding[];
};

export const getMapPinsRpc = async (params: {
  query_text: string | null;
  location_coordinates?: { lat: number; lng: number };
  radius_meters?: number;
  filters?: {
    cities?: string[];
    styles?: string[]; // Kept for compatibility but unused
    architects?: string[];
    category_id?: string;
    typology_ids?: string[];
    attribute_ids?: string[];
  };
  p_limit?: number;
}): Promise<DiscoveryBuildingMapPin[]> => {
  const { data, error } = await supabase.rpc('get_map_pins', params);
  if (error) throw error;

  // Map snake_case to camelCase
  return (data || []).map((pin: any) => ({
    ...pin,
    isCandidate: pin.is_candidate,
  })) as DiscoveryBuildingMapPin[];
};

export const getBuildingsByIds = async (ids: string[]) => {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      main_image_url,
      architects:building_architects(architect:architects(name, id)),
      functional_category_id,
      typologies:building_functional_typologies(typology_id),
      attributes:building_attributes(attribute_id)
    `)
    .in('id', ids);

  if (error) throw error;
  return data || [];
};

export const getDiscoveryFiltersRpc = async (): Promise<{ cities: string[]; styles: {id: string, name: string, slug: string}[] }> => {
  try {
    const { data, error } = await supabase.rpc('get_discovery_filters');
    if (error) throw error;
    return data as { cities: string[]; styles: {id: string, name: string, slug: string}[] };
  } catch (error) {
    console.warn("get_discovery_filters RPC failed", error);
    return { cities: [], styles: [] };
  }
};

export const getBuildingLeaderboardsRpc = async (): Promise<LeaderboardData> => {
  try {
    const { data, error } = await supabase.rpc('get_building_leaderboards');
    if (error) throw error;
    return data as unknown as LeaderboardData;
  } catch (error) {
    console.warn("get_building_leaderboards RPC failed", error);
    return { most_visited: [], top_rated: [] };
  }
};

export const findNearbyBuildingsRpc = async (params: {
    lat: number;
    long: number;
    radius_meters: number;
    name_query?: string
}): Promise<any[]> => {
    try {
        const { data, error } = await supabase.rpc('find_nearby_buildings', params);
        if (error) throw error;
        return data;
    } catch (error) {
        console.warn("find_nearby_buildings RPC failed", error);
        return [];
    }
};

export const fetchUserBuildingsMap = async (userId: string): Promise<Map<string, string>> => {
    const { data, error } = await supabase
        .from("user_buildings")
        .select("building_id, status")
        .eq("user_id", userId);

    if (error) {
        console.warn("Error fetching user buildings map:", error);
        return new Map();
    }

    const map = new Map();
    data.forEach(item => map.set(item.building_id, item.status));
    return map;
};

export const fetchBuildingDetails = async (id: string) => {
    let query = supabase.from("buildings").select("*, styles:building_styles(style:architectural_styles(id, name))");

    // Check if id is UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isShortId = /^\d+$/.test(id);

    if (isUUID) {
        query = query.eq("id", id);
    } else if (isShortId) {
        // Assume short_id
        query = query.eq("short_id", parseInt(id));
    } else {
        // Assume slug
        query = query.eq("slug", id);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Building not found");

    // Transform styles from nested structure to flat array of objects
    const styles = (data.styles as any)?.map((s: any) => s.style) || [];

    return { ...data, styles };
};

export const fetchUserBuildingStatus = async (userId: string, buildingId: string) => {
     const { data, error } = await supabase
        .from("user_buildings")
        .select("*")
        .eq("user_id", userId)
        .eq("building_id", buildingId)
        .maybeSingle();

     if (error) throw error;

     return data;
};

export const upsertUserBuilding = async (data: {
  user_id: string;
  building_id: string;
  status: 'visited' | 'pending';
  rating?: number | null;
  content?: string | null;
  tags?: string[] | null;
  visibility?: string;
  edited_at?: string;
}) => {
    const { data: result, error } = await supabase
      .from("user_buildings")
      .upsert(data, { onConflict: "user_id, building_id" } as any)
      .select()
      .single();

    if (error) throw error;
    return result;
};

export const deleteUserBuilding = async (id: string) => {
    const { error } = await supabase
        .from("user_buildings")
        .delete()
        .eq("id", id);

    if (error) throw error;
    return true;
};
