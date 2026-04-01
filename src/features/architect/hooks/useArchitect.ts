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
  status: string | null;
}

interface UseArchitectResult {
  architect: Architect | null;
  buildings: ArchitectBuilding[];
  linkedUser: { username: string | null } | null;
  loading: boolean;
  error: Error | null;
}

interface UseArchitectOptions {
  initialArchitect?: Architect | null;
  initialLinkedUser?: { username: string } | null;
}

type BuildingArchitectNestedRow = {
  building:
    | {
        id: string;
        name: string;
        city: string | null;
        country: string | null;
        year_completed: number | null;
        main_image_url: string | null;
        status: string | null;
      }
    | {
        id: string;
        name: string;
        city: string | null;
        country: string | null;
        year_completed: number | null;
        main_image_url: string | null;
        status: string | null;
      }[]
    | null;
};

export function useArchitect(
  architectId: string | undefined | null,
  options: UseArchitectOptions = {},
): UseArchitectResult {
  const { initialArchitect = null, initialLinkedUser = null } = options;

  const [architect, setArchitect] = useState<Architect | null>(initialArchitect);
  const [buildings, setBuildings] = useState<ArchitectBuilding[]>([]);
  const [linkedUser, setLinkedUser] = useState<{ username: string | null } | null>(
    initialLinkedUser ? { username: initialLinkedUser.username } : null,
  );
  const [loading, setLoading] = useState<boolean>(!initialArchitect);
  const [error, setError] = useState<Error | null>(null);

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

    const fetchArchitectData = async (id: string, { skipArchitect }: { skipArchitect?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      try {
        if (!skipArchitect) {
          // Fetch architect details (table not in generated Database until `npm run gen-types`)
          const { data: architectData, error: architectError } = await supabase
            .from("architects")
            .select("*")
            .eq("id", id)
            .single();

          if (architectError) throw architectError;

          if (isMounted) {
            setArchitect(architectData as Architect);
          }

          // Check if there is a linked user profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("username")
            .eq("verified_architect_id", id)
            .maybeSingle();

          if (!profileError && profileData && isMounted) {
            setLinkedUser({ username: profileData.username });
          }
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
          .eq("architect_id", id);

        if (buildingsError) throw buildingsError;

        if (isMounted) {
          // Transform data to extract the nested building object
          const formattedBuildings = (buildingsData || [])
            .map((item: BuildingArchitectNestedRow) => {
              const raw = item.building;
              const b = Array.isArray(raw) ? raw[0] : raw;
              if (!b) return null;

              return {
                id: b.id,
                name: b.name,
                city: b.city,
                country: b.country,
                year_completed: b.year_completed,
                main_image_url: b.main_image_url || null,
                status: b.status || null,
              };
            })
            .filter((b): b is ArchitectBuilding => b !== null);

          setBuildings(formattedBuildings);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const code =
            typeof err === "object" && err !== null && "code" in err
              ? String((err as { code?: string }).code)
              : undefined;
          if (code === "PGRST116") {
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

    void fetchArchitectData(architectId, { skipArchitect: !!initialArchitect });

    return () => {
      isMounted = false;
    };
  }, [architectId, initialArchitect]);

  return { architect, buildings, linkedUser, loading, error };
}
