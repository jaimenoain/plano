import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
export function useArchitect(architectId) {
    const [architect, setArchitect] = useState(null);
    const [buildings, setBuildings] = useState([]);
    const [linkedUser, setLinkedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        // Reset state when ID is missing
        if (!architectId) {
            setArchitect(null);
            setBuildings([]);
            setLinkedUser(null);
            setLoading(false);
            return undefined;
        }
        let isMounted = true;
        const fetchArchitectData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch architect details (table not in generated Database until `npm run gen-types`)
                const { data: architectData, error: architectError } = await supabase
                    .from("architects")
                    .select("*")
                    .eq("id", architectId)
                    .single();
                if (architectError)
                    throw architectError;
                if (isMounted) {
                    setArchitect(architectData);
                }
                // Check if there is a linked user profile
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("verified_architect_id", architectId)
                    .maybeSingle();
                if (!profileError && profileData && isMounted) {
                    setLinkedUser({ username: profileData.username });
                }
                // Fetch associated buildings
                const { data: buildingsData, error: buildingsError } = await supabase
                    .from("building_architects")
                    .select(`
            building:buildings(
              id,
              name,
              city,
              country,
              year_completed,
              main_image_url,
              status
            )
          `)
                    .eq("architect_id", architectId);
                if (buildingsError)
                    throw buildingsError;
                if (isMounted) {
                    // Transform data to extract the nested building object
                    const formattedBuildings = (buildingsData || [])
                        .map((item) => {
                        const raw = item.building;
                        const b = Array.isArray(raw) ? raw[0] : raw;
                        if (!b)
                            return null;
                        return {
                            id: b.id,
                            name: b.name,
                            city: b.city,
                            country: b.country,
                            year_completed: b.year_completed,
                            main_image_url: b.main_image_url || null,
                            status: b.status || null
                        };
                    })
                        .filter((b) => b !== null);
                    setBuildings(formattedBuildings);
                }
            }
            catch (err) {
                if (isMounted) {
                    const code = typeof err === "object" && err !== null && "code" in err
                        ? String(err.code)
                        : undefined;
                    if (code === "PGRST116") {
                        setError(new Error("Architect not found"));
                    }
                    else {
                        setError(err instanceof Error ? err : new Error("Unknown error"));
                    }
                    setArchitect(null);
                    setBuildings([]);
                    setLinkedUser(null);
                }
            }
            finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        fetchArchitectData();
        return () => {
            isMounted = false;
        };
    }, [architectId]);
    return { architect, buildings, linkedUser, loading, error };
}
