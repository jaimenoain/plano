import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  hero_image_url?: string | null;
  community_preview_url?: string | null;
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
          hero_image_url,
          community_preview_url,
          building_architects!inner(architect_id)
        `)
        .eq("building_architects.architect_id", architectId);

      if (error) {
        throw error;
      }

      const formattedBuildings = (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        city: b.city,
        country: b.country,
        hero_image_url: b.hero_image_url,
        community_preview_url: b.community_preview_url,
      })) as PortfolioBuilding[];

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
