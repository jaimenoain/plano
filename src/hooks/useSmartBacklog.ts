import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SmartFilm } from "@/components/groups/watchlist/SmartFilmCard";

export interface FilterState {
  excludeSeen: boolean;
  maxRuntime: number | null;
  providers: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSmartBacklog(group: any, selectedMemberIds: string[], filters: FilterState) {
  return useQuery({
    queryKey: ["group-smart-backlog", group?.id, selectedMemberIds, filters],
    queryFn: async () => {
      if (selectedMemberIds.length === 0) return [];

      // 1. Fetch relevant logs (watchlist and seen) for selected members
      const { data: logs, error: logsError } = await supabase
        .from("log")
        .select(`
          film_id,
          user_id,
          status,
          rating,
          watched_at
        `)
        .in("user_id", selectedMemberIds)
        .in("status", ["watchlist", "watched"]);

      if (logsError) throw logsError;

      // 2. Process logs
      const watchlistMap = new Map<string, Set<string>>(); // film_id -> Set<user_id>
      const seenSet = new Set<string>(); // film_id (if seen by ANY selected member)

      logs.forEach((log) => {
        const isSeen = log.status === "watched" || log.rating !== null || log.watched_at !== null;

        if (isSeen) {
           seenSet.add(log.film_id);
        } else if (log.status === "watchlist") {
           if (!watchlistMap.has(log.film_id)) {
             watchlistMap.set(log.film_id, new Set());
           }
           watchlistMap.get(log.film_id)?.add(log.user_id);
        }
      });

      // 3. Filter IDs
      let candidateFilmIds = Array.from(watchlistMap.keys());

      // Filter: Exclude Seen
      if (filters.excludeSeen) {
        candidateFilmIds = candidateFilmIds.filter((id) => !seenSet.has(id));
      }

      if (candidateFilmIds.length === 0) return [];

      // 4. Fetch Film Details for candidates
      const { data: filmDetails, error: filmsError } = await supabase
        .from("films")
        .select("*")
        .in("id", candidateFilmIds);

      if (filmsError) throw filmsError;

      // 5. Final Aggregation & Filtering (Runtime, Providers)
      const results: SmartFilm[] = filmDetails
        .filter((film) => {
           // Filter: Runtime
           if (filters.maxRuntime && film.runtime && film.runtime > filters.maxRuntime) {
             return false;
           }

           // Filter: Providers
           if (filters.providers.length > 0) {
             const watchProviders = film.watch_providers as any;
             if (!watchProviders) return false;

             let hasProvider = false;
             for (const countryCode in watchProviders) {
                const countryData = watchProviders[countryCode];
                if (countryData?.flatrate) {
                   // eslint-disable-next-line @typescript-eslint/no-explicit-any
                   const providers = countryData.flatrate.map((p: any) => p.provider_name);
                   if (filters.providers.some(p => providers.includes(p))) {
                      hasProvider = true;
                      break;
                   }
                }
             }
             if (!hasProvider) return false;
           }

           return true;
        })
        .map((film) => {
          const interestedUserIds = Array.from(watchlistMap.get(film.id) || []);

          const interestedUsers = group.members
            .filter((m: any) => interestedUserIds.includes(m.user.id))
            .map((m: any) => ({
              id: m.user.id,
              username: m.user.username,
              avatar_url: m.user.avatar_url
            }));

          return {
            id: film.id,
            tmdb_id: film.tmdb_id,
            title: film.title,
            poster_path: film.poster_path,
            release_date: film.release_date,
            runtime: film.runtime,
            overview: film.overview,
            vote_average: film.vote_average,
            trailer: film.trailer,
            overlap_count: interestedUserIds.length,
            interested_users: interestedUsers,
            total_selected_members: selectedMemberIds.length,
          };
        });

      // 6. Sort
      // Primary: Overlap Count (Desc)
      // Secondary: Vote Average (Desc)
      return results.sort((a, b) => {
        if (b.overlap_count !== a.overlap_count) {
          return b.overlap_count - a.overlap_count;
        }
        return (b.vote_average || 0) - (a.vote_average || 0);
      });
    },
    enabled: !!group?.id,
  });
}
