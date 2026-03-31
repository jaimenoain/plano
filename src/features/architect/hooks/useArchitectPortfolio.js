import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export function useArchitectPortfolio(architectId) {
    const query = useQuery({
        queryKey: ["architect_portfolio", architectId],
        queryFn: async () => {
            if (!architectId)
                return [];
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
            const rows = (data || []);
            return rows.map((b) => ({
                id: b.id,
                name: b.name,
                city: b.city,
                country: b.country,
                year_completed: b.year_completed,
                hero_image_url: b.hero_image_url,
                community_preview_url: b.community_preview_url,
            }));
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
