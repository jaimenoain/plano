import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProviderMap(countryCode: string | null) {
  return useQuery({
    queryKey: ["provider-map", countryCode],
    queryFn: async () => {
      if (!countryCode) return {};

      const { data, error } = await supabase.functions.invoke("tmdb-providers", {
        body: { watch_region: countryCode, type: "movie" },
      });

      if (error) throw error;

      // Data structure from TMDB /watch/providers/movie is { results: [ { provider_id, provider_name, ... }, ... ] }
      const providers = data.results || [];
      const map: Record<string, number> = {};

      providers.forEach((p: any) => {
        if (p.provider_name && p.provider_id) {
            map[p.provider_name] = p.provider_id;
        }
      });

      return map;
    },
    enabled: !!countryCode,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
