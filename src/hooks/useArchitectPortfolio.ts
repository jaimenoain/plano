import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  building_images: { id: string; storage_path: string }[] | null;
}

export function useArchitectPortfolio(architectId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["architect_portfolio", architectId],
    queryFn: async () => {
      if (!architectId) return [];
      console.log("DEBUG: fetchPortfolio architectId:", architectId);

      const { data, error } = await supabase
        .from("building_architects")
        .select(`
          building:buildings (
            id,
            name,
            city,
            country,
            building_images (
              id,
              storage_path
            )
          )
        `)
        .eq("architect_id", architectId);

      console.log("DEBUG: Portfolio query result:", { data, error });

      if (error) {
        console.error("DEBUG: Portfolio query error:", error.message, error.details, error);
        throw error;
      }

      console.log("DEBUG: Buildings count found:", data?.length);

      const formattedBuildings = (data || [])
        .map((item: any) => {
          const b = item.building;
          if (!b) return null;
          return {
            id: b.id,
            name: b.name,
            city: b.city,
            country: b.country,
            building_images: b.building_images || null,
          };
        })
        .filter((b: PortfolioBuilding | null) => b !== null) as PortfolioBuilding[];

      return formattedBuildings;
    },
    enabled: !!architectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    buildings: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
