import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Architect {
  id: string;
  name: string;
  type: "individual" | "studio";
  headquarters?: string | null;
  website_url?: string | null;
  bio?: string | null;
}

export interface ArchitectBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  main_image_url: string | null;
}

interface UseArchitectResult {
  architect: Architect | null;
  buildings: ArchitectBuilding[];
  linkedUser: { username: string | null } | null;
  loading: boolean;
  error: Error | null;
}

export function useArchitect(architectId: string | undefined | null): UseArchitectResult {
  const [architect, setArchitect] = useState<Architect | null>(null);
  const [buildings, setBuildings] = useState<ArchitectBuilding[]>([]);
  const [linkedUser, setLinkedUser] = useState<{ username: string | null } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when ID is missing
    if (!architectId) {
      setArchitect(null);
      setBuildings([]);
      setLinkedUser(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchArchitectData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch architect details
        // @ts-ignore - architects table created in migration
        const { data: architectData, error: architectError } = await supabase
          .from("architects")
          .select("*")
          .eq("id", architectId)
          .single();

        if (architectError) throw architectError;

        if (isMounted) {
            setArchitect(architectData as Architect);
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
        // @ts-ignore - building_architects table created in migration
        const { data: buildingsData, error: buildingsError } = await supabase
          .from("building_architects")
          .select(`
            building:buildings(
              id,
              name,
              city,
              country,
              year_completed,
              main_image_url
            )
          `)
          .eq("architect_id", architectId);

        if (buildingsError) throw buildingsError;

        if (isMounted) {
            // Transform data to extract the nested building object
            const formattedBuildings = (buildingsData || [])
            .map((item: any) => {
              const b = item.building;
              if (!b) return null;

              return {
                id: b.id,
                name: b.name,
                city: b.city,
                country: b.country,
                year_completed: b.year_completed,
                main_image_url: b.main_image_url || null
              };
            })
            .filter((b: any) => b !== null) as ArchitectBuilding[];

            setBuildings(formattedBuildings);
        }
      } catch (err: any) {
        if (isMounted) {
            console.error("Error fetching architect data:", err);

            // Handle "Row not found" specifically
            if (err.code === 'PGRST116') {
                setError(new Error("Architect not found"));
            } else {
                setError(err instanceof Error ? err : new Error("Unknown error"));
            }

            setArchitect(null);
            setBuildings([]);
            setLinkedUser(null);
        }
      } finally {
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
