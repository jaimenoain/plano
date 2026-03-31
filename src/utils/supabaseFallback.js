import { supabase } from "@/integrations/supabase/client";
export const searchBuildingsRpc = async (params) => {
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
        throw error;
    }
    return (data || []).map((b) => {
        const row = b;
        return {
            ...row,
            architects: (row.architects || []).map((ba) => ba.architect),
            styles: (row.styles || []).map((s) => s.style),
            typologies: (row.typologies || []).map((t) => t.typology?.name).filter(Boolean),
        };
    });
};
export const getMapPinsRpc = async (params) => {
    const { data, error } = await supabase.rpc('get_map_pins', params);
    if (error)
        throw error;
    // Map snake_case to camelCase
    return (data || []).map((pin) => {
        const p = pin;
        return {
            ...p,
            isCandidate: p.is_candidate,
        };
    });
};
export const getBuildingsByIds = async (ids) => {
    if (!ids.length)
        return [];
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
    if (error)
        throw error;
    return data || [];
};
export const getDiscoveryFiltersRpc = async () => {
    try {
        const { data, error } = await supabase.rpc('get_discovery_filters');
        if (error)
            throw error;
        return data;
    }
    catch (_error) {
        return { cities: [], styles: [] };
    }
};
export const getBuildingLeaderboardsRpc = async () => {
    try {
        const { data, error } = await supabase.rpc('get_building_leaderboards');
        if (error)
            throw error;
        return data;
    }
    catch (_error) {
        return { most_visited: [], top_rated: [] };
    }
};
export const findNearbyBuildingsRpc = async (params) => {
    try {
        const { data, error } = await supabase.rpc('find_nearby_buildings', params);
        if (error)
            throw error;
        return data;
    }
    catch (_error) {
        return [];
    }
};
export const fetchUserBuildingsMap = async (userId) => {
    const { data, error } = await supabase
        .from("user_buildings")
        .select("building_id, status")
        .eq("user_id", userId);
    if (error) {
        return new Map();
    }
    const map = new Map();
    data.forEach(item => map.set(item.building_id, item.status));
    return map;
};
export const fetchBuildingDetails = async (id) => {
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
    }
    else if (isShortId) {
        // Assume short_id
        query = query.eq("short_id", parseInt(id));
    }
    else {
        // Assume slug
        query = query.eq("slug", id);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error)
        throw error;
    if (!data)
        throw new Error("Building not found");
    const styles = Array.isArray(data.styles)
        ? data.styles.map((s) => s.style)
        : [];
    const architects = Array.isArray(data.architects)
        ? data.architects.map((a) => a.architect)
        : [];
    const categoryName = data.category && typeof data.category === "object" && data.category !== null && "name" in data.category
        ? String(data.category.name)
        : null;
    const typologies = Array.isArray(data.typologies)
        ? data.typologies
            .map((t) => t.typology?.name)
            .filter(Boolean)
        : [];
    const attributesRaw = Array.isArray(data.attributes)
        ? data.attributes
            .map((a) => a.attribute)
            .filter(Boolean)
        : [];
    const materials = attributesRaw
        .filter((a) => a.group?.slug === 'materiality' || a.group?.slug === 'materials')
        .map((a) => a.name);
    const context = attributesRaw
        .filter((a) => a.group?.slug === 'context')
        .map((a) => a.name)
        .join(', ') || null; // usually context is displayed as a string
    const intervention = attributesRaw
        .filter((a) => a.group?.slug === 'intervention' || a.group?.slug === 'interventions')
        .map((a) => a.name)
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
export const fetchUserBuildingStatus = async (userId, buildingId) => {
    const { data, error } = await supabase
        .from("user_buildings")
        .select("*")
        .eq("user_id", userId)
        .eq("building_id", buildingId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
};
export const upsertUserBuilding = async (data) => {
    const { data: result, error } = await supabase
        .from("user_buildings")
        .upsert(data, { onConflict: "user_id, building_id" })
        .select()
        .single();
    if (error)
        throw error;
    return result;
};
export const deleteUserBuilding = async (id) => {
    const { error } = await supabase
        .from("user_buildings")
        .delete()
        .eq("id", id);
    if (error)
        throw error;
    return true;
};
