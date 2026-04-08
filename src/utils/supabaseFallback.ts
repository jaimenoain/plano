import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyBuildingPathIdSegment } from "@/utils/buildingPathId";
import { DiscoveryBuilding, DiscoveryBuildingMapPin, LeaderboardData } from "@/features/search/components/types";
import {
  visibleCreditSummariesFromEmbed,
  type BuildingCreditEmbed,
} from "@/features/credits/api/credits";

export const searchBuildingsRpc = async (params: {
  query_text: string | null;
  location_coordinates?: { lat: number; lng: number };
  radius_meters?: number;
  filters?: {
    cities?: string[];
    styles?: string[];
    creditEntityIds?: string[];
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
    building_credits(
      credit_tier,
      status,
      person:people(id, name),
      company:companies(id, name)
    ),
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

  type CreditEmbed = {
    credit_tier?: string;
    status?: string;
    person?: { id: string; name: string } | null;
    company?: { id: string; name: string } | null;
  };

  return (data || []).map((b: unknown) => {
    const row = b as Record<string, unknown> & {
      building_credits?: CreditEmbed[] | null;
      styles?: { style: unknown }[];
      typologies?: { typology?: { name?: string } }[];
    };
    const rawCredits = row.building_credits ?? [];
    const primaryVisible = rawCredits.filter(
      (c) =>
        c.credit_tier === "primary" &&
        (c.status === "active" || c.status === "verified"),
    );
    const credits = primaryVisible
      .map((c) => {
        const p = c.person;
        const co = c.company;
        if (p && co) return { id: p.id, name: `${p.name} @ ${co.name}` };
        if (p) return { id: p.id, name: p.name };
        if (co) return { id: co.id, name: co.name };
        return null;
      })
      .filter((a): a is { id: string; name: string } => a != null);
    const { building_credits: _bc, ...rest } = row;
    return {
      ...rest,
      credits,
      styles: (row.styles || []).map((s) => s.style),
      typologies: (row.typologies || []).map((t) => t.typology?.name).filter(Boolean),
    };
  }) as unknown as DiscoveryBuilding[];
};

export const getMapPinsRpc = async (params: {
  query_text: string | null;
  location_coordinates?: { lat: number; lng: number };
  radius_meters?: number;
  filters?: {
    cities?: string[];
    styles?: string[]; // Kept for compatibility but unused
    creditEntityIds?: string[];
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
  const rows = Array.isArray(data) ? data : [];
  return rows.map((pin: unknown) => {
    const p = pin as Record<string, unknown> & { is_candidate?: boolean };
    return {
      ...p,
      isCandidate: p.is_candidate,
    };
  }) as DiscoveryBuildingMapPin[];
};

export const getBuildingsByIds = async (ids: string[]) => {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      main_image_url,
      building_credits(
        credit_tier,
        status,
        person:people(id, name),
        company:companies(id, name)
      ),
      functional_category_id,
      typologies:building_functional_typologies(typology_id),
      attributes:building_attributes(attribute_id)
    `)
    .in('id', ids);

  if (error) throw error;

  type CreditEmbed = {
    credit_tier?: string;
    status?: string;
    person?: { id: string; name: string } | null;
    company?: { id: string; name: string } | null;
  };

  return (data || []).map((b: unknown) => {
    const row = b as Record<string, unknown> & { building_credits?: CreditEmbed[] | null };
    const rawCredits = row.building_credits ?? [];
    const primaryVisible = rawCredits.filter(
      (c) =>
        c.credit_tier === "primary" &&
        (c.status === "active" || c.status === "verified"),
    );
    const credits = primaryVisible
      .map((c) => {
        const p = c.person;
        const co = c.company;
        if (p && co) return { id: p.id, name: `${p.name} @ ${co.name}` };
        if (p) return { id: p.id, name: p.name };
        if (co) return { id: co.id, name: co.name };
        return null;
      })
      .filter((a): a is { id: string; name: string } => a != null);
    const { building_credits: _bc, ...rest } = row;
    return { ...rest, credits };
  });
};

export const getDiscoveryFiltersRpc = async (): Promise<{ cities: string[]; styles: {id: string, name: string, slug: string}[] }> => {
  try {
    const { data, error } = await supabase.rpc('get_discovery_filters');
    if (error) throw error;
    return data as { cities: string[]; styles: {id: string, name: string, slug: string}[] };
  } catch (_error) {
return { cities: [], styles: [] };
  }
};

export const getBuildingLeaderboardsRpc = async (): Promise<LeaderboardData> => {
  try {
    const { data, error } = await supabase.rpc('get_building_leaderboards');
    if (error) throw error;
    return data as unknown as LeaderboardData;
  } catch (_error) {
return { most_visited: [], top_rated: [] };
  }
};

export const findNearbyBuildingsRpc = async (params: {
    lat: number;
    long: number;
    radius_meters: number;
    name_query?: string
}): Promise<unknown[]> => {
    try {
        const { data, error } = await supabase.rpc('find_nearby_buildings', params);
        if (error) throw error;
        return (data as unknown as unknown[]) ?? [];
    } catch (_error) {
return [];
    }
};

export const fetchUserBuildingsMap = async (userId: string): Promise<Map<string, string>> => {
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

export const fetchBuildingDetails = async (id: string, client?: SupabaseClient) => {
    const db = client ?? supabase;

    let query = db.from("buildings").select(`
      *,
      alt_name,
      aliases,
      styles:building_styles(style:architectural_styles(id, name)),
      category:functional_categories(name),
      typologies:building_functional_typologies(typology:functional_typologies(name, id)),
      attributes:building_attributes(attribute:attributes(name, id, group_id, group:attribute_groups(slug))),
      building_credits(status, person:people(id, name), company:companies(id, name))
    `);

    const segment = classifyBuildingPathIdSegment(id);
    if (segment.kind === "uuid") {
        query = query.eq("id", segment.value);
    } else if (segment.kind === "shortId") {
        query = query.eq("short_id", segment.value);
    } else {
        query = query.eq("slug", segment.value);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Building not found");

    // Transform styles from nested structure to flat array of objects
    type AttrRow = { group?: { slug?: string }; name?: string };
    const styles = Array.isArray(data.styles)
      ? data.styles.map((s: unknown) => (s as { style: unknown }).style)
      : [];

    const categoryName =
      data.category && typeof data.category === "object" && data.category !== null && "name" in data.category
        ? String((data.category as { name: unknown }).name)
        : null;
    const typologies = Array.isArray(data.typologies)
      ? data.typologies
          .map((t: unknown) => (t as { typology?: { name?: string } }).typology?.name)
          .filter(Boolean)
      : [];

    const attributesRaw: AttrRow[] = Array.isArray(data.attributes)
      ? data.attributes
          .map((a: unknown) => (a as { attribute: AttrRow }).attribute)
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

    type Row = typeof data & { building_credits?: BuildingCreditEmbed[] | null };
    const row = data as Row;
    const bc = row.building_credits;
    const { building_credits: _omitCredits, ...rest } = row;

    return {
        ...rest,
        styles,
        creditedEntities: visibleCreditSummariesFromEmbed(bc ?? undefined),
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
      .upsert(data, { onConflict: "user_id, building_id" })
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
