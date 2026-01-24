import { supabase } from "@/integrations/supabase/client";
import { DiscoveryBuilding, LeaderboardData, LeaderboardBuilding } from "@/features/search/components/types";

// Types for Legacy Schema
interface LegacyFilm {
  id: string | number; // Legacy ID might be int, but we treat as string for compat
  title: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
}

interface LegacyLog {
  id: string;
  film_id: string | number;
  user_id: string;
  status: 'watched' | 'watchlist' | 'review';
  rating: number | null;
  created_at: string;
}

// Helpers
const mapFilmToDiscovery = (film: any): DiscoveryBuilding => ({
  id: String(film.id),
  name: film.title,
  main_image_url: film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null,
  architects: [], // Not available in legacy
  year_completed: film.release_date ? parseInt(film.release_date.substring(0, 4)) : null,
  city: null, // Not available
  country: null,
  location_lat: 0,
  location_lng: 0,
  distance: undefined,
  social_context: undefined,
  social_score: 0
});

export const searchBuildingsRpc = async (params: {
  query_text: string | null;
  location_coordinates?: { lat: number; lng: number };
  radius_meters?: number;
  filters?: { cities?: string[]; styles?: string[] };
  sort_by?: 'distance' | 'relevance';
}): Promise<DiscoveryBuilding[]> => {
  try {
    const { data, error } = await supabase.rpc('search_buildings', params);
    if (error) throw error;
    return data as DiscoveryBuilding[];
  } catch (error) {
    console.warn("search_buildings RPC failed, falling back to legacy films query", error);

    // Fallback: Query films table
    let query = supabase.from('films' as any).select('id, title, poster_path, release_date');

    if (params.query_text) {
      query = query.ilike('title', `%${params.query_text}%`);
    }

    // Note: Filters (city/style) and Location/Distance sort cannot be supported in legacy fallback
    // We just return matching titles.

    const { data: films, error: filmError } = await query.limit(50);

    if (filmError) {
      console.error("Legacy fallback query failed", filmError);
      return [];
    }

    return (films || []).map(mapFilmToDiscovery);
  }
};

export const getDiscoveryFiltersRpc = async (): Promise<{ cities: string[]; styles: string[] }> => {
  try {
    const { data, error } = await supabase.rpc('get_discovery_filters');
    if (error) throw error;
    return data as { cities: string[]; styles: string[] };
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
    try {
        // Try new schema
        const { data, error } = await supabase
            .from("user_buildings")
            .select("building_id, status")
            .eq("user_id", userId);

        if (error) throw error;

        const map = new Map();
        data.forEach(item => map.set(item.building_id, item.status));
        return map;
    } catch (error) {
        // Fallback to legacy log
        const { data: logs, error: logError } = await supabase
            .from("log" as any)
            .select("film_id, status")
            .eq("user_id", userId);

        if (logError) {
            console.error("Fetch user buildings fallback failed", logError);
            return new Map();
        }

        const map = new Map();
        (logs || []).forEach((item: any) => {
            const status = item.status === 'watched' ? 'visited' : (item.status === 'watchlist' ? 'pending' : item.status);
            map.set(String(item.film_id), status);
        });
        return map;
    }
};

export const fetchBuildingDetails = async (id: string) => {
    // 1. Try buildings table
    const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (!error && data) {
        return data;
    }

    // 2. Fallback to films
    const { data: film, error: filmError } = await supabase
        .from("films" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (filmError || !film) {
        throw error || filmError || new Error("Building not found");
    }

    return {
        id: String(film.id),
        name: film.title,
        location: null, // No location
        address: "Location Unknown",
        architects: [],
        year_completed: film.release_date ? parseInt(film.release_date.substring(0, 4)) : null,
        styles: [],
        main_image_url: film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null,
        description: film.overview || "",
        created_by: null // unknown
    };
};

export const fetchUserBuildingStatus = async (userId: string, buildingId: string) => {
     // Try new schema
     const { data, error } = await supabase
        .from("user_buildings")
        .select("*")
        .eq("user_id", userId)
        .eq("building_id", buildingId)
        .maybeSingle();

     if (!error && data) return data;

     // Fallback
     const { data: log, error: logError } = await supabase
        .from("log" as any)
        .select("*")
        .eq("user_id", userId)
        .eq("film_id", buildingId)
        .maybeSingle();

     if (log) {
         return {
             ...log,
             status: log.status === 'watched' ? 'visited' : (log.status === 'watchlist' ? 'pending' : log.status),
             rating: log.rating
         };
     }

     return null;
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
  try {
    const { data: result, error } = await supabase
      .from("user_buildings")
      .upsert(data, { onConflict: "user_id, building_id" } as any)
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    console.warn("upsert user_buildings failed, falling back to log", error);

    // Fallback: Map to log table
    // legacy status: 'visited' -> 'watched', 'pending' -> 'watchlist'
    const legacyStatus = data.status === 'visited' ? 'watched' : 'watchlist';

    const legacyData = {
      user_id: data.user_id,
      film_id: data.building_id,
      status: legacyStatus,
      rating: data.rating || null,
      // Note: content, tags, visibility are not supported in legacy log table and are dropped
    };

    const { data: logResult, error: logError } = await supabase
      .from("log" as any)
      .upsert(legacyData, { onConflict: "user_id, film_id" } as any)
      .select()
      .single();

    if (logError) throw logError;

    // Map back result to match user_buildings shape (partially)
    return {
        ...logResult,
        building_id: logResult.film_id,
        status: logResult.status === 'watched' ? 'visited' : (logResult.status === 'watchlist' ? 'pending' : logResult.status)
    };
  }
};

export const deleteUserBuilding = async (id: string) => {
    try {
        const { error } = await supabase
            .from("user_buildings")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.warn("delete user_buildings failed, falling back to log", error);

        const { error: logError } = await supabase
            .from("log" as any)
            .delete()
            .eq("id", id);

        if (logError) throw logError;
        return true;
    }
};
