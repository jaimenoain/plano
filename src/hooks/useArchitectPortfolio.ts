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

      const { data, error } = await supabase
        .from("buildings")
        .select(`
          id,
          name,
          city,
          country,
          building_images(
            id,
            storage_path
          )
        `)
        .eq("architect_id", architectId);

      if (error) {
        throw error;
      }

      const formattedBuildings = (data || [])
        .map((item: any) => {
          return {
            id: item.id,
            name: item.name,
            city: item.city,
            country: item.country,
            building_images: item.building_images || null,
          };
        })
        .filter((b: any) => b !== null) as PortfolioBuilding[];

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
