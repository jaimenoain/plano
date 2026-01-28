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
}

interface UseArchitectResult {
  architect: Architect | null;
  buildings: ArchitectBuilding[];
  loading: boolean;
  error: Error | null;
}

export function useArchitect(architectId: string | undefined | null): UseArchitectResult {
  const [architect, setArchitect] = useState<Architect | null>(null);
  const [buildings, setBuildings] = useState<ArchitectBuilding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when ID is missing
    if (!architectId) {
      setArchitect(null);
      setBuildings([]);
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
              year_completed
            )
          `)
          .eq("architect_id", architectId);

        if (buildingsError) throw buildingsError;

        if (isMounted) {
            // Transform data to extract the nested building object
            const formattedBuildings = (buildingsData || [])
            .map((item: any) => item.building)
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

  return { architect, buildings, loading, error };
}
