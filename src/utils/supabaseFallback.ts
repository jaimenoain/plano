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
  p_access_levels?: string[];
  p_access_logistics?: string[];
  p_access_costs?: string[];
}): Promise<DiscoveryBuilding[]> => {
  let query = supabase.from('buildings').select(`
    id,
    name,
    address,
    location,
    city,
    country,
    slug,
    short_id,
    main_image_url,
    year_completed,
    popularity_score,
    access_level,
    access_logistics,
    access_cost,
    status,
    architects:building_architects(architect:architects(id, name)),
    styles:building_styles(style:architectural_styles(id, name)),
    typologies:building_functional_typologies(typology:functional_typologies(name, id))
  `);

  if (params.query_text && params.query_text.trim().length > 0) {
    const qt = params.query_text.trim();
    query = query.or(`name.ilike.%${qt}%,alt_name.ilike.%${qt}%,address.ilike.%${qt}%`);
  }

  if (params.filters) {
    if (params.filters.cities && params.filters.cities.length > 0) {
      query = query.in('city', params.filters.cities);
    }
    if (params.filters.category_id) {
      query = query.eq('functional_category_id', params.filters.category_id);
    }
  }

  if (params.p_access_levels && params.p_access_levels.length > 0) {
    query = query.in('access_level', params.p_access_levels);
  }
  if (params.p_access_logistics && params.p_access_logistics.length > 0) {
    query = query.in('access_logistics', params.p_access_logistics);
  }
  if (params.p_access_costs && params.p_access_costs.length > 0) {
    query = query.in('access_cost', params.p_access_costs);
  }

  // To prevent errors and as we don't have all PostGIS distance features easy without RPC
  // we just limit the results.
  query = query.limit(params.p_limit || 50);

  const { data, error } = await query;

  if (error) {
    console.error('searchBuildingsRpc direct query error:', error);
    throw error;
  }

  return (data || []).map((b: any) => ({
    ...b,
    architects: (b.architects || []).map((ba: any) => ba.architect),
    styles: (b.styles || []).map((s: any) => s.style),
    typologies: (b.typologies || []).map((t: any) => t.typology?.name).filter(Boolean),
  })) as DiscoveryBuilding[];
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
  min_lat?: number;
  max_lat?: number;
  min_lng?: number;
  max_lng?: number;
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
    let query = supabase.from("buildings").select(`
      *,
      alt_name,
      aliases,
      styles:building_styles(style:architectural_styles(id, name)),
      architects:building_architects(architect:architects(id, name)),
      category:functional_categories(name),
      typologies:building_functional_typologies(typology:functional_typologies(name, id)),
      attributes:building_attributes(attribute:attributes(name, id, group_id, group:attribute_groups(slug)))
    `);

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

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Building not found");

    // Transform styles from nested structure to flat array of objects
    const styles = (data.styles as any)?.map((s: any) => s.style) || [];
    const architects = (data.architects as any)?.map((a: any) => a.architect) || [];

    // Transform taxonomy structures
    const categoryName = (data.category as any)?.name || null;
    const typologies = (data.typologies as any)?.map((t: any) => t.typology?.name).filter(Boolean) || [];

    // Transform attributes based on group
    const attributesRaw = (data.attributes as any)?.map((a: any) => a.attribute).filter(Boolean) || [];

    const materials = attributesRaw
        .filter((a: any) => a.group?.slug === 'materiality' || a.group?.slug === 'materials')
        .map((a: any) => a.name);

    const context = attributesRaw
        .filter((a: any) => a.group?.slug === 'context')
        .map((a: any) => a.name)
        .join(', ') || null; // usually context is displayed as a string

    const intervention = attributesRaw
        .filter((a: any) => a.group?.slug === 'intervention' || a.group?.slug === 'interventions')
        .map((a: any) => a.name)
        .join(', ') || null;

    return {
        ...data,
        styles,
        architects,
        category: categoryName,
        typology: typologies,
        materials: materials.length > 0 ? materials : null,
        context: context,
        intervention: intervention
    };
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
