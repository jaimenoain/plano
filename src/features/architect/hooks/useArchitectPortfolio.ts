import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url?: string | null;
  community_preview_url?: string | null;
}

interface PortfolioBuildingQueryRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url?: string | null;
  community_preview_url?: string | null;
}

export function useArchitectPortfolio(architectId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["architect_portfolio", architectId],
    queryFn: async () => {
      if (!architectId) return [];

      // @ts-expect-error — buildings relation missing from generated types
      const { data, error } = await supabase
        .from("buildings")
        .select(`
          id,
          name,
          city,
          country,
          year_completed,
          hero_image_url,
          community_preview_url,
          building_architects!inner(architect_id)
        `)
        .eq("building_architects.architect_id", architectId);

      if (error) {
        throw error;
      }

      const rows = (data || []) as PortfolioBuildingQueryRow[];

      return rows.map(
        (b): PortfolioBuilding => ({
          id: b.id,
          name: b.name,
          city: b.city,
          country: b.country,
          year_completed: b.year_completed,
          hero_image_url: b.hero_image_url,
          community_preview_url: b.community_preview_url,
        })
      );
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
