import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { ResolvedIDs, SortOption, Provider } from "./useSearchFilters";

export interface TMDBResult {
  id: number;
  title?: string;
  original_title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  overview: string;
  media_type?: string;
  profile_path?: string | null;
  genre_ids?: number[];
  friend_rating?: number;
  latest_interaction?: string;
  vote_count?: number;
  countries?: any;
  tier?: number; // 1: Friend, 2: Community, 3: Global
}

interface TieredSearchParams {
  query: string;
  activeTab: "movies" | "tv" | "users";
  contentTypes?: ("movie" | "tv")[];
  sortBy: SortOption;
  selectedGenres: number[];
  selectedDecades: string[];
  selectedRuntimes: string[];
  selectedCountries: string[];
  selectedPeople: { id: number; name: string }[];
  watchlistUser: string | null;
  notSeenByUser: string | null; // "me" or user
  seenByUser: string | null;
  ratedByUsernames: string[];
  notSeenByUsernames: string[];
  selectedTags: string[];
  onlyMyPlatforms: boolean;
  availableRentBuy: boolean;
  selectedProviders: Provider[];
  resolvedIds: ResolvedIDs;
  userCountry?: string | null;
  userPlatforms?: string[] | null;
  minRating: number | null;
  ratedByFriends: boolean;
  friendsMinRating: number | null;
}

export function useTieredSearch(user: User | null) {
  const [results, setResults] = useState<TMDBResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [friendRatings, setFriendRatings] = useState<Record<number, number>>({});
  const { toast } = useToast();

  const fetchRatingsForItems = useCallback(async (items: TMDBResult[], targetUserIds: string[]) => {
    if (items.length === 0 || !user) return {};
    try {
      let fetchForUsers = [...targetUserIds];
      if (fetchForUsers.length === 0) {
         const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
         fetchForUsers = follows?.map(f => f.following_id) || [];
      }
      if (fetchForUsers.length === 0) return {};

      const tmdbIds = items.map(r => r.id);

      const { data: filmMap } = await supabase
        .from("films")
        .select("id, tmdb_id")
        .in("tmdb_id", tmdbIds);

      if (!filmMap || filmMap.length === 0) return {};
      const internalIdToTmdbId = new Map(filmMap.map(f => [f.id, f.tmdb_id]));
      const internalIds = filmMap.map(f => f.id);

      const { data: logs } = await supabase
        .from("log")
        .select("film_id, rating")
        .in("film_id", internalIds)
        .in("user_id", fetchForUsers)
        .not("rating", "is", null);

      if (!logs || logs.length === 0) return {};

      const ratingsSum: Record<number, { sum: number; count: number }> = {};
      logs.forEach(log => {
        const tmdbId = internalIdToTmdbId.get(log.film_id);
        if (tmdbId !== undefined && log.rating !== null) {
          if (!ratingsSum[tmdbId!]) ratingsSum[tmdbId!] = { sum: 0, count: 0 };
          ratingsSum[tmdbId!].sum += log.rating;
          ratingsSum[tmdbId!].count += 1;
        }
      });

      const averages: Record<number, number> = {};
      Object.keys(ratingsSum).forEach(k => {
        const key = parseInt(k);
        const data = ratingsSum[key];
        averages[key] = data.sum / data.count;
      });
      return averages;
    } catch (error) {
      console.error("Error calculating ratings:", error);
      return {};
    }
  }, [user]);

  const performTieredSearch = useCallback(async (params: TieredSearchParams, isLoadMore = false) => {
    if (!user) return;
    setLoading(true);
    if (!isLoadMore) {
        setFriendRatings({});
    }

    try {
        const {
            query, activeTab, contentTypes, sortBy, selectedGenres, selectedDecades, selectedRuntimes,
            selectedCountries, selectedPeople, watchlistUser, notSeenByUser, seenByUser,
            ratedByUsernames, notSeenByUsernames, selectedTags, onlyMyPlatforms, availableRentBuy,
            selectedProviders, resolvedIds, userCountry, userPlatforms,
            minRating, ratedByFriends, friendsMinRating
        } = params;

        // Determine effective media types
        // If contentTypes is provided, use it.
        // If contentTypes is empty, it means "Show Both" (user explicitly deselected none, implying all).
        let effectiveTypes: ("movie" | "tv")[] = [];
        if (contentTypes && contentTypes.length > 0) {
            effectiveTypes = contentTypes;
        } else if (contentTypes && contentTypes.length === 0) {
            // Explicitly empty contentTypes means "All" (Movies & TV)
            effectiveTypes = ["movie", "tv"];
        } else if (activeTab === "movies") {
            effectiveTypes = ["movie"];
        } else if (activeTab === "tv") {
            effectiveTypes = ["tv"];
        } else {
            // Default both
            effectiveTypes = ["movie", "tv"];
        }

        // p_media_type for RPC: 'movie', 'tv', or null (both)
        const rpcMediaType = effectiveTypes.length === 2 ? null : effectiveTypes[0];

        const hasFilters = selectedGenres.length > 0 || selectedCountries.length > 0 ||
                       selectedDecades.length > 0 || selectedRuntimes.length > 0 ||
                       selectedPeople.length > 0 || !!watchlistUser ||
                       ratedByUsernames.length > 0 || notSeenByUsernames.length > 0 ||
                       !!notSeenByUser || !!seenByUser || selectedTags.length > 0 || onlyMyPlatforms || availableRentBuy || selectedProviders.length > 0 ||
                       !!minRating || ratedByFriends || !!friendsMinRating;

        const currentOffset = isLoadMore ? offset : 0;
        const limit = 50;
        let tieredResults: TMDBResult[] = [];

        // Prepare my_platforms
        let effectivePlatforms = (onlyMyPlatforms && userPlatforms && userPlatforms.length > 0) ? [...userPlatforms] : [];
        if (selectedProviders.length > 0) {
            effectivePlatforms = [...new Set([...effectivePlatforms, ...selectedProviders.map(p => p.name)])];
        }
        const usePlatformFilter = onlyMyPlatforms || selectedProviders.length > 0;

        // 1. RPC Search (Tier 1 & 2)
        if (selectedPeople.length === 0) {
            let runtimeMin: number | null = null;
            let runtimeMax: number | null = null;

            if (selectedRuntimes.length > 0) {
                const ranges = selectedRuntimes.map(r => {
                    if (r === "short") return [0, 105];
                    if (r === "medium") return [105, 120];
                    if (r === "long") return [120, 135];
                    if (r === "epic") return [135, 999];
                    return [0, 999];
                });
                const mins = ranges.map(r => r[0]);
                const maxs = ranges.map(r => r[1]);
                if (mins.length > 0) runtimeMin = Math.min(...mins);
                if (maxs.length > 0) runtimeMax = Math.max(...maxs);
            }

            let ratedByUserIds: string[] | null = resolvedIds.ratedBy && resolvedIds.ratedBy.length > 0 ? [...resolvedIds.ratedBy] : null;

            if (ratedByFriends) {
                const { data: follows } = await supabase
                    .from("follows")
                    .select("following_id")
                    .eq("follower_id", user.id);

                const friendIds = follows ? follows.map(f => f.following_id) : [];
                const currentIds = ratedByUserIds || [];
                const mergedIds = [...new Set([...currentIds, ...friendIds])];
                ratedByUserIds = mergedIds;
            }

            const rpcParams = {
                p_query: query || null,
                p_genre_ids: selectedGenres.length > 0 ? selectedGenres : null,
                p_countries: selectedCountries.length > 0 ? selectedCountries : null,
                p_decade_starts: selectedDecades.length > 0 ? selectedDecades.map(d => parseInt(d)) : null,
                p_runtime_min: runtimeMin,
                p_runtime_max: runtimeMax === 999 ? null : runtimeMax,
                p_limit: limit,
                p_offset: currentOffset,
                p_user_country: userCountry || null,
                p_only_my_platforms: usePlatformFilter,
                p_my_platforms: (usePlatformFilter && effectivePlatforms.length > 0) ? effectivePlatforms : null,
                p_rent_buy: availableRentBuy,
                p_watchlist_user_id: resolvedIds.watchlist || null,
                p_seen_by_user_id: resolvedIds.seen || null,
                p_not_seen_by_user_id: resolvedIds.notSeen || null,
                p_rated_by_user_ids: ratedByUserIds,
                p_media_type: rpcMediaType,
                p_min_rating: minRating || null,
                p_friends_min_rating: ratedByFriends ? (friendsMinRating || null) : null
            };

            const { data: rpcData, error } = await supabase.rpc('search_films_tiered', rpcParams);
            if (error) throw error;

            if (rpcData) {
                tieredResults = rpcData.map((item: any) => ({
                    id: item.tmdb_id,
                    title: item.title,
                    original_title: item.original_title,
                    name: item.title,
                    poster_path: item.poster_path,
                    overview: item.overview,
                    release_date: item.release_date,
                    first_air_date: item.release_date,
                    media_type: item.media_type,
                    genre_ids: item.genre_ids,
                    countries: item.countries,
                    friend_rating: item.friend_avg_rating,
                    tier: item.tier,
                    vote_count: item.vote_count
                }));
            }
        }

        const isLocalExhausted = tieredResults.length < limit;
        const isRestrictiveFilter = !!watchlistUser || !!seenByUser || ratedByUsernames.length > 0 || selectedTags.length > 0;

        // 2. Edge Function Search (Tier 3)
        if (!isRestrictiveFilter && isLocalExhausted && (query.trim().length > 0 || tieredResults.length < 20)) {
            if (currentOffset === 0 || query.trim().length > 0) {

                const filters: any = {
                    genres: selectedGenres,
                    people: selectedPeople.map(p => p.id)
                };
                if (selectedCountries.length > 0) filters.country = selectedCountries;
                if (selectedDecades.length > 0) {
                     filters.dates = selectedDecades.map(d => {
                         const year = parseInt(d);
                         return { gte: `${year}-01-01`, lte: `${year+9}-12-31` };
                     });
                }

                if (selectedProviders.length > 0 && userCountry) {
                    filters.watch_region = userCountry;
                    filters.with_watch_providers = selectedProviders.map(p => p.id).join("|");
                }

                let tmdbResults: any[] = [];
                const tmdbPage = Math.floor(currentOffset / 20) + 1;

                if (query.trim().length > 0) {
                     // Search with Query
                     // If both types are selected, use 'multi' search or parallel calls?
                     // tmdb-search accepts 'type'. If we use 'multi', we get mixed results.
                     // The edge function constructs `search/${type}`. So passing `multi` works.

                     let typeParam = "multi";
                     if (effectiveTypes.length === 1) {
                         typeParam = effectiveTypes[0]; // 'movie' or 'tv'
                     }

                     const { data, error } = await supabase.functions.invoke("tmdb-search", {
                         body: { query, type: typeParam, page: tmdbPage }
                     });

                     if (!error && data.results) {
                         tmdbResults = data.results.filter((r: any) => {
                             if (typeParam === "multi") {
                                 // Filter by effective types
                                 if (!r.media_type) return false;
                                 return effectiveTypes.includes(r.media_type);
                             }
                             return true;
                         });
                         // If explicit single type was requested, ensure media_type is set on results (TMDB sometimes omits it on single search, but we need it)
                         if (typeParam !== "multi") {
                             tmdbResults = tmdbResults.map((r: any) => ({ ...r, media_type: typeParam }));
                         }
                     }

                } else if (hasFilters) {
                     // Filter Mode (Discover)
                     // If mixed types, we must call discover for both and merge.

                     if (effectiveTypes.length === 2) {
                         // Parallel calls
                         const [movieRes, tvRes] = await Promise.all([
                             supabase.functions.invoke("tmdb-search", {
                                 body: { type: "discover_movie", filters, page: tmdbPage }
                             }),
                             supabase.functions.invoke("tmdb-search", {
                                 body: { type: "discover_tv", filters, page: tmdbPage }
                             })
                         ]);

                         let combined: any[] = [];
                         if (!movieRes.error && movieRes.data.results) {
                             combined = [...combined, ...movieRes.data.results.map((r: any) => ({ ...r, media_type: 'movie' }))];
                         }
                         if (!tvRes.error && tvRes.data.results) {
                             combined = [...combined, ...tvRes.data.results.map((r: any) => ({ ...r, media_type: 'tv' }))];
                         }

                         // Sort by popularity (assuming popularity is present)
                         combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                         // Slice to mimic pagination size (20 per page usually from TMDB, but here we have 40 max)
                         tmdbResults = combined.slice(0, 20);

                     } else {
                         // Single type
                         const type = effectiveTypes[0] === "tv" ? "discover_tv" : "discover_movie";
                         const { data, error } = await supabase.functions.invoke("tmdb-search", {
                             body: { type, filters, page: tmdbPage }
                         });
                         if (!error && data.results) {
                             tmdbResults = data.results.map((r: any) => ({ ...r, media_type: effectiveTypes[0] }));
                         }
                     }

                } else if (tieredResults.length === 0 && currentOffset === 0) {
                     // Empty search (Trending/Popular)
                     if (effectiveTypes.length === 2) {
                        const [movieRes, tvRes] = await Promise.all([
                            supabase.functions.invoke("tmdb-search", {
                                body: { type: "discover_movie", sort_by: "popularity.desc", page: tmdbPage }
                            }),
                            supabase.functions.invoke("tmdb-search", {
                                body: { type: "discover_tv", sort_by: "popularity.desc", page: tmdbPage }
                            })
                        ]);

                        let combined: any[] = [];
                        if (!movieRes.error && movieRes.data.results) {
                            combined = [...combined, ...movieRes.data.results.map((r: any) => ({ ...r, media_type: 'movie' }))];
                        }
                        if (!tvRes.error && tvRes.data.results) {
                            combined = [...combined, ...tvRes.data.results.map((r: any) => ({ ...r, media_type: 'tv' }))];
                        }
                        combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                        tmdbResults = combined.slice(0, 20);

                     } else {
                        const type = effectiveTypes[0] === "tv" ? "discover_tv" : "discover_movie";
                        const { data, error } = await supabase.functions.invoke("tmdb-search", {
                            body: { type, sort_by: "popularity.desc", page: tmdbPage }
                        });
                        if (!error && data.results) {
                            tmdbResults = data.results.map((r: any) => ({ ...r, media_type: effectiveTypes[0] }));
                        }
                     }
                }

                // Deduplication
                const existingIds = new Set(tieredResults.map(r => r.id));
                if (isLoadMore) {
                    results.forEach(r => existingIds.add(r.id));
                }

                let newGlobalResults = tmdbResults
                    .filter((r: any) => !existingIds.has(r.id))
                    .map((r: any) => ({ ...r, tier: 3 }));

                // Post-filter: Not Seen By
                if (resolvedIds.notSeen && newGlobalResults.length > 0) {
                    const candidateTmdbIds = newGlobalResults.map((r: any) => r.id);
                    const { data: seenData } = await supabase
                        .from('films')
                        .select('tmdb_id, log!inner(user_id, status)')
                        .in('tmdb_id', candidateTmdbIds)
                        .eq('log.user_id', resolvedIds.notSeen)
                        .eq('log.status', 'watched');

                    if (seenData && seenData.length > 0) {
                        const seenTmdbIds = new Set(seenData.map((d: any) => d.tmdb_id));
                        newGlobalResults = newGlobalResults.filter((r: any) => !seenTmdbIds.has(r.id));
                    }
                }

                tieredResults = [...tieredResults, ...newGlobalResults];
            }
        }

        // 3. Client-Side Availability Check
        if ((usePlatformFilter || availableRentBuy) && userCountry) {
            const candidateTmdbIds = tieredResults.filter(r => r.tier === 3).map(r => r.id);

            if (candidateTmdbIds.length > 0) {
                const { data: availabilityData } = await supabase
                    .from("film_availability")
                    .select("tmdb_id, stream, rent, buy")
                    .in("tmdb_id", candidateTmdbIds)
                    .eq("country_code", userCountry || "US");

                if (availabilityData) {
                    const availabilityMap = new Map(availabilityData.map(d => [d.tmdb_id, d]));
                    tieredResults = tieredResults.filter(item => {
                        if (item.tier !== 3) return true;

                        const avail = availabilityMap.get(item.id);
                        if (!avail) return true; // Keep optimistic

                        let matchesMyPlatform = false;
                        let matchesRentBuy = false;
                        let matchesSelectedProvider = false;

                        const streams = (avail.stream as any[]) || [];

                        if (onlyMyPlatforms) {
                            const hasStream = streams.some(p => userPlatforms?.includes(p.provider_name));
                            if (hasStream) matchesMyPlatform = true;
                        }

                        if (selectedProviders.length > 0) {
                             const hasProvider = streams.some(p => selectedProviders.some(sp => sp.name === p.provider_name));
                             if (hasProvider) matchesSelectedProvider = true;
                        }

                        if (availableRentBuy) {
                            const rents = (avail.rent as any[]) || [];
                            const buys = (avail.buy as any[]) || [];
                            if (rents.length > 0 || buys.length > 0) matchesRentBuy = true;
                        }

                        let keep = false;
                        if (onlyMyPlatforms && matchesMyPlatform) keep = true;
                        if (availableRentBuy && matchesRentBuy) keep = true;
                        if (selectedProviders.length > 0 && matchesSelectedProvider) keep = true;

                        return keep;
                    });
                }
            }
        }

        // 4. Client-Side Rating Fetch for Tier 3
        const tier3Items = tieredResults.filter(r => r.tier === 3);
        if (tier3Items.length > 0 && user) {
             const ratings = await fetchRatingsForItems(tier3Items, resolvedIds.ratedBy || []);
             setFriendRatings(prev => ({...prev, ...ratings}));
             tieredResults = tieredResults.map(r => {
                 if (r.tier === 3 && ratings[r.id]) {
                     return { ...r, friend_rating: ratings[r.id] };
                 }
                 return r;
             });
        }

        // 5. Sorting
        tieredResults.sort((a, b) => {
             const tierA = a.tier || 3;
             const tierB = b.tier || 3;
             if (tierA !== tierB) return tierA - tierB;

             switch (sortBy) {
                  case "relevance":
                      if (tierA === 1) return (b.friend_rating || 0) - (a.friend_rating || 0);
                      if (tierA === 2) return (b.vote_count || 0) - (a.vote_count || 0);
                      return (b.vote_count || 0) - (a.vote_count || 0);
                  case "rating_desc": return (b.friend_rating || 0) - (a.friend_rating || 0);
                  case "rating_asc": return (a.friend_rating || 0) - (b.friend_rating || 0);
                  case "recency":
                       return new Date(b.latest_interaction || b.release_date || 0).getTime() - new Date(a.latest_interaction || a.release_date || 0).getTime();
                  case "release_desc": return new Date(b.release_date || b.first_air_date || 0).getTime() - new Date(a.release_date || a.first_air_date || 0).getTime();
                  case "release_asc": return new Date(a.release_date || a.first_air_date || 0).getTime() - new Date(b.release_date || b.first_air_date || 0).getTime();
                  case "title": return (a.title || a.name || "").localeCompare(b.title || b.name || "");
                  default: return 0;
             }
        });

        // 6. State Update
        if (isLoadMore) {
            setResults(prev => [...prev, ...tieredResults]);
            setOffset(prev => prev + limit);
        } else {
            setResults(tieredResults);
            setOffset(limit);
        }
        setHasMore(tieredResults.length >= limit || tieredResults.length >= 20);

    } catch (error: any) {
        console.error("Search error:", error);
        toast({ variant: "destructive", title: "Search failed", description: "Please try again later." });
    } finally {
        setLoading(false);
    }
  }, [user, offset, fetchRatingsForItems, toast]);

  const loadMore = useCallback((params: TieredSearchParams) => {
      performTieredSearch(params, true);
  }, [performTieredSearch]);

  const triggerSearch = useCallback((params: TieredSearchParams) => {
      setOffset(0);
      setHasMore(true);
      performTieredSearch(params, false);
  }, [performTieredSearch]);

  return { results, loading, hasMore, loadMore, triggerSearch, friendRatings };
}
