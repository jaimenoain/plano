import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Search as SearchIcon, 
  Users, 
  Film, 
  Tv, 
  Loader2, 
  X, 
  Star, 
  Copy,
  ArrowUpDown,
  Filter,
  PlayCircle,
  Bookmark
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn, slugify } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchFilters, SortOption, Provider } from "./hooks/useSearchFilters";
import { useTieredSearch, TMDBResult } from "./hooks/useTieredSearch";
import { FilterSheet } from "./components/FilterSheet";

// --- Types ---

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
  mutuals_count?: number;
}

// --- Static Data ---

const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

const TV_GENRES = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10762, name: "Kids" },
  { id: 9648, name: "Mystery" },
  { id: 10763, name: "News" },
  { id: 10764, name: "Reality" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10766, name: "Soap" },
  { id: 10767, name: "Talk" },
  { id: 10768, name: "War & Politics" },
  { id: 37, name: "Western" },
];

const COMBINED_GENRES = Array.from(
  new Map(
    [...MOVIE_GENRES, ...TV_GENRES].map((g) => [g.id, g])
  ).values()
).sort((a, b) => a.name.localeCompare(b.name));

const RUNTIMES = [
  { label: "Under 1h 45m", value: "short" }, 
  { label: "1h 45m - 2h", value: "medium" },
  { label: "2h - 2h 15m", value: "long" }, 
  { label: "Over 2h 15m", value: "epic" }, 
];

export default function Search() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // 1. Filter Logic extracted to Hook
  const filters = useSearchFilters(user, profile?.username || null);
  
  // 2. Search Logic extracted to Hook
  const { results, loading, hasMore, loadMore, triggerSearch, friendRatings } = useTieredSearch(user);

  // Local state for UI not needing persistence
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [peopleResults, setPeopleResults] = useState<TMDBResult[]>([]);
  const [watchlistCount, setWatchlistCount] = useState<number | null>(null);

  // Sheet state
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(() => {
    return searchParams.has("rated_by");
  });

  // Provider Search State
  const [providerQuery, setProviderQuery] = useState("");
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [fetchedProviders, setFetchedProviders] = useState<boolean>(false);

  // Helper to fetch providers when needed (e.g. when sheet is opened or tab changed to providers)
  // For now, we will fetch when sheet is opened if not fetched yet
  useEffect(() => {
    if (isFilterSheetOpen && !fetchedProviders && profile?.country) {
        fetchProviders(profile.country);
    }
  }, [isFilterSheetOpen, profile?.country, fetchedProviders]);

  const fetchProviders = async (countryCode: string) => {
      setLoadingProviders(true);
      try {
          const { data: tmdbResponse, error } = await supabase.functions.invoke("tmdb-providers", {
              body: { watch_region: countryCode },
          });
          if (!error && tmdbResponse?.results) {
              const providers = tmdbResponse.results.map((p: any) => ({
                  id: p.provider_id.toString(), // Store as string for consistency
                  name: p.provider_name,
                  logo: p.logo_path
              }));
              // Sort and unique
              const unique = Array.from(new Map(providers.map((p: any) => [p.name, p])).values())
                  .sort((a: any, b: any) => a.name.localeCompare(b.name));
              setAvailableProviders(unique as Provider[]);
              setFetchedProviders(true);
          }
      } catch (e) {
          console.error("Error fetching providers", e);
      } finally {
          setLoadingProviders(false);
      }
  };

  // Redirect if not auth
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Trigger Search when filters change
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (filters.activeTab === "users") {
        if (filters.query.trim().length >= 2) searchUsers();
        else setUsers([]);
      } else {
        triggerSearch({
            ...filters,
            userCountry: profile?.country,
            userPlatforms: profile?.subscribed_platforms
        });
      }
    }, 500);
    return () => clearTimeout(debounce);
  }, [
      // Dependency list mirroring the filter hook state
      filters.query, filters.activeTab, filters.sortBy, filters.selectedGenres,
      filters.selectedDecades, filters.selectedRuntimes, filters.selectedCountries,
      filters.selectedPeople, filters.watchlistUser, filters.notSeenByUser,
      filters.seenByUser, filters.ratedByUsernames, filters.notSeenByUsernames,
      filters.selectedTags, filters.onlyMyPlatforms, filters.availableRentBuy,
      filters.selectedProviders,
      filters.resolvedIds, user, profile
  ]);

  // Fetch Friends
  useEffect(() => {
    async function fetchFriends() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("follows")
          .select(`following_id, profiles!follows_following_id_fkey (id, username, avatar_url, bio)`)
          .eq("follower_id", user.id);

        if (data) {
          const formattedFriends = data.map((f: any) => ({
            ...f.profiles,
            is_following: true,
          }));
          setFriends(formattedFriends);
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    }
    fetchFriends();
  }, [user]);

  // Fetch Watchlist Count if filter active
  useEffect(() => {
    if (filters.watchlistUser && filters.resolvedIds.watchlist) {
        supabase.from('watchlist')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', filters.resolvedIds.watchlist)
                .then(({ count }) => setWatchlistCount(count));
    } else {
        setWatchlistCount(null);
    }
  }, [filters.watchlistUser, filters.resolvedIds.watchlist]);


  // People Search Effect
  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (filters.peopleQuery.trim().length >= 2) {
        try {
          const { data, error } = await supabase.functions.invoke("tmdb-search", {
            body: { query: filters.peopleQuery, type: "person" },
          });
          if (!error && data.results) setPeopleResults(data.results.slice(0, 5));
        } catch (e) { console.error(e); }
      } else {
        setPeopleResults([]);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [filters.peopleQuery]);


  // --- Helper Functions ---

  const searchUsers = async () => {
    if (!user) return;
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .ilike("username", `%${filters.query}%`)
        .neq("id", user.id)
        .limit(20);

      if (error) throw error;

      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = new Set(follows?.map((f) => f.following_id) || []);
      const usersWithFollowStatus = (profiles || []).map((profile) => ({
        ...profile,
        is_following: followingIds.has(profile.id),
      }));
      setUsers(usersWithFollowStatus);
    } catch (error) {
      console.error("User search error:", error);
    }
  };

  const handleFollow = async (userId: string, isFollowing: boolean) => {
    if (!user) return;
    const updateState = (prev: UserProfile[]) => prev.map((u) => u.id === userId ? { ...u, is_following: !isFollowing } : u);
    setUsers(updateState);
    
    try {
      if (isFollowing) await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      else await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
    } catch (error) {
      setUsers(prev => prev.map((u) => u.id === userId ? { ...u, is_following: isFollowing } : u));
    }
  };

  const selectMedia = (item: TMDBResult) => {
    // If media_type is present in result, use it. Otherwise, infer from filter or activeTab.
    // However, item.media_type should be populated by hook.
    let mediaType = item.media_type;

    if (!mediaType) {
        // Fallback
        if (filters.contentTypes.length === 1) mediaType = filters.contentTypes[0];
        else if (filters.activeTab === "movies") mediaType = "movie";
        else if (filters.activeTab === "tv") mediaType = "tv";
        else mediaType = "movie"; // Last resort
    }

    const slug = slugify(item.title || item.name || "");
    navigate(`/${mediaType}/${slug}/${item.id}`);
  };

  // Determine which genres to show
  const genres = useMemo(() => {
    if (filters.contentTypes.length === 1) {
        return filters.contentTypes[0] === "tv" ? TV_GENRES : MOVIE_GENRES;
    }
    // If mixed or empty (default both), show combined
    return COMBINED_GENRES;
  }, [filters.contentTypes]);
  const currentYear = new Date().getFullYear();
  const decades = useMemo(() => {
    const d = [];
    for (let year = currentYear - (currentYear % 10); year >= 1900; year -= 10) d.push(year);
    return d;
  }, [currentYear]);

  // Available Tags
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  useEffect(() => {
     async function fetchTags() {
         if (!user) return;
         let friendIds: string[] = [];

         if (friends.length > 0) {
             friendIds = friends.map(f => f.id);
         } else {
             const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
             friendIds = follows?.map(f => f.following_id) || [];
         }

         if (friendIds.length === 0) {
             setAvailableTags([]);
             return;
         }

         const { data } = await supabase
             .from('log')
             .select('tags')
             .in('user_id', friendIds)
             .not('tags', 'is', null);
         if (data) {
             const allTags = data.flatMap(d => d.tags || []);
             const unique = Array.from(new Set(allTags)).sort();
             setAvailableTags(unique);
         }
     }
     fetchTags();
  }, [user, friends]);

  const hasFilters = filters.selectedGenres.length > 0 || filters.selectedCountries.length > 0 ||
                       filters.selectedDecades.length > 0 || filters.selectedRuntimes.length > 0 ||
                       filters.selectedPeople.length > 0 || !!filters.watchlistUser ||
                       filters.ratedByUsernames.length > 0 || filters.notSeenByUsernames.length > 0 ||
                       !!filters.notSeenByUser || filters.selectedTags.length > 0 || filters.onlyMyPlatforms || filters.availableRentBuy || filters.selectedProviders.length > 0;

  // Calculate active filters count
  const activeFiltersCount =
    filters.selectedGenres.length +
    filters.selectedCountries.length +
    filters.selectedDecades.length +
    filters.selectedRuntimes.length +
    filters.selectedPeople.length +
    (filters.watchlistUser ? 1 : 0) +
    filters.ratedByUsernames.length +
    filters.notSeenByUsernames.length +
    (filters.notSeenByUser ? 1 : 0) +
    filters.selectedTags.length +
    (filters.onlyMyPlatforms ? 1 : 0) +
    (filters.availableRentBuy ? 1 : 0) +
    filters.selectedProviders.length +
    (filters.seenByUser ? 1 : 0) +
    (filters.ratedByFriends ? 1 : 0);

  const activePreset = filters.savedViews.find(v => v.id === filters.activeViewId);

  return (
    <AppLayout title="Find" showLogo={false}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Search Bar & Tabs */}
        <div className="space-y-4">
          <div className="flex justify-end">
             <button
                onClick={() => filters.setActiveTab(filters.activeTab === 'users' ? 'movies' : 'users')}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
             >
                {filters.activeTab === 'users' ? 'Search Movies & TV' : 'Search Users'}
             </button>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={filters.activeTab === "users" ? "Search users..." : "Search by title..."}
              value={filters.query}
              onChange={(e) => filters.setQuery(e.target.value)}
              className="pl-10 h-12 text-lg bg-secondary/50 border-border focus:border-primary transition-all"
            />
          </div>

          {filters.activeTab !== "users" && (
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                 <Button
                    variant={hasFilters ? "secondary" : "outline"}
                    className={cn(
                        "h-10 gap-2 border-dashed transition-all relative pr-10",
                        hasFilters && "border-solid bg-secondary hover:bg-secondary/80 pr-10"
                    )}
                    onClick={() => setIsFilterSheetOpen(true)}
                 >
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">
                        {activePreset
                            ? `Filters: ${activePreset.name}`
                            : activeFiltersCount > 0
                                ? `Filters (${activeFiltersCount})`
                                : "Filters"
                        }
                    </span>

                 </Button>

                 {/* Explicit Reset Button on the Trigger if active */}
                 {hasFilters && (
                    <div className="relative -ml-8 z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-background/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                filters.clearAllFilters();
                            }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                 )}

                 <FilterSheet
                    open={isFilterSheetOpen}
                    onOpenChange={setIsFilterSheetOpen}
                    filters={filters}
                    profile={profile}
                    friends={friends}
                    availableProviders={availableProviders}
                    loadingProviders={loadingProviders}
                    providerQuery={providerQuery}
                    setProviderQuery={setProviderQuery}
                    peopleResults={peopleResults}
                    setPeopleResults={setPeopleResults}
                    availableTags={availableTags}
                    genres={genres}
                    countries={COUNTRIES}
                    decades={decades}
                    runtimes={RUNTIMES}
                 />
             </div>

              <Select value={filters.sortBy} onValueChange={(v) => filters.setSortBy(v as SortOption)}>
                <SelectTrigger className="w-10 px-0 md:w-[180px] md:px-3 [&>svg]:hidden md:[&>svg]:block justify-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                    <span className="hidden md:block truncate">
                      <SelectValue placeholder="Sort by" />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="rating_desc">Friend Rating</SelectItem>
                  <SelectItem value="recency">Recently Active</SelectItem>
                  <SelectItem value="release_desc">Release (Newest)</SelectItem>
                  <SelectItem value="release_asc">Release (Oldest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filter Trigger Row */}
        {filters.activeTab !== "users" && (
          <div className="space-y-4">
             {/* Active Filters Badges */}
             <div className="flex flex-wrap gap-2">
                 {filters.watchlistUser && <Badge variant="secondary" className="gap-1 pl-2">{filters.watchlistUser === profile?.username ? "In Watchlist" : `${filters.watchlistUser}'s Watchlist`}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setWatchlistUser(null)} /></Badge>}
                 {filters.notSeenByUser && <Badge variant="secondary" className="gap-1 pl-2">{filters.notSeenByUser === profile?.username ? "Not Seen By Me" : `Not Seen By ${filters.notSeenByUser}`}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setNotSeenByUser(null)} /></Badge>}
                 {filters.seenByUser && <Badge variant="secondary" className="gap-1 pl-2">{filters.seenByUser === profile?.username ? "Watched" : `Watched by ${filters.seenByUser}`}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setSeenByUser(null)} /></Badge>}
                 {filters.ratedByFriends && <Badge variant="secondary" className="gap-1 pl-2">Rated By Friends<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setRatedByFriends(false)} /></Badge>}
                 {filters.onlyMyPlatforms && <Badge variant="secondary" className="gap-1 pl-2">My Platforms<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setOnlyMyPlatforms(false)} /></Badge>}
                 {filters.availableRentBuy && <Badge variant="secondary" className="gap-1 pl-2">Rent/Buy<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setAvailableRentBuy(false)} /></Badge>}
                 {filters.selectedProviders.map(p => <Badge key={p.id} variant="secondary" className="gap-1 pl-2">{p.name}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setSelectedProviders(prev => prev.filter(x => x.id !== p.id))} /></Badge>)}
                 {filters.selectedGenres.map(id => <Badge key={id} variant="secondary" className="gap-1 pl-2">{genres.find(g => g.id === id)?.name}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setSelectedGenres(prev => prev.filter(x => x !== id))} /></Badge>)}
                 {filters.selectedCountries.map(c => <Badge key={c} variant="secondary" className="gap-1 pl-2">{COUNTRIES.find(x => x.code === c)?.name}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setSelectedCountries(prev => prev.filter(x => x !== c))} /></Badge>)}
                 {filters.selectedDecades.map(d => <Badge key={d} variant="secondary" className="gap-1 pl-2">{d}s<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setSelectedDecades(prev => prev.filter(x => x !== d))} /></Badge>)}
                 {filters.selectedRuntimes.map(r => <Badge key={r} variant="secondary" className="gap-1 pl-2">{RUNTIMES.find(rt => rt.value === r)?.label}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setSelectedRuntimes(prev => prev.filter(x => x !== r))} /></Badge>)}
                 {filters.selectedPeople.map(p => <Badge key={p.id} variant="secondary" className="gap-1 pl-2">{p.name}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setSelectedPeople(prev => prev.filter(x => x.id !== p.id))} /></Badge>)}
                 {filters.selectedTags.map(t => <Badge key={t} variant="secondary" className="gap-1 pl-2">#{t}<X className="h-3 w-3 cursor-pointer" onClick={() => filters.setSelectedTags(prev => prev.filter(x => x !== t))} /></Badge>)}

             </div>
          </div>
        )}

        {/* Results Area */}
        {loading && results.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filters.activeTab === "users" ? (
          // --- Users Tab Content ---
          <div className="space-y-6">
            {users.length > 0 ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {users.map(profile => (
                   <div key={profile.id} className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate(`/profile/${profile.username?.toLowerCase()}`)}>
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>{profile.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile.username}</p>
                        {profile.bio && <p className="text-sm text-muted-foreground truncate">{profile.bio}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={profile.is_following ? "secondary" : "default"}
                        onClick={(e) => { e.stopPropagation(); handleFollow(profile.id, profile.is_following); }}
                      >
                        {profile.is_following ? "Following" : "Follow"}
                      </Button>
                   </div>
                 ))}
               </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
                    <div className="bg-secondary/50 p-4 rounded-full mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                        {filters.query.trim().length < 2 ? "Find Friends" : "No users found"}
                    </h3>
                    <p className="text-muted-foreground max-w-[250px] mb-6">
                        {filters.query.trim().length < 2
                            ? "Search for your friends by name or username."
                            : "We couldn't find anyone with that name. Why not invite them to join?"}
                    </p>
                    {profile?.username && (
                        <Button
                            onClick={() => {
                                navigator.clipboard.writeText(`Join me on Cineforum! https://cineforum.eu/?invited_by=${profile.username}`)
                                    .then(() => {
                                        toast({
                                            title: "Link copied!",
                                            description: "Invite link copied to clipboard.",
                                        });
                                    })
                                    .catch(() => {
                                        toast({
                                            title: "Failed to copy",
                                            description: "Please try manually copying the link.",
                                            variant: "destructive",
                                        });
                                    });
                            }}
                            className="gap-2 min-w-[200px]"
                        >
                            <Copy className="h-4 w-4" />
                            Copy Invite Link
                        </Button>
                    )}
                </div>
            )}
          </div>
        ) : (
          // --- Films / TV Content (Tiered) ---
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 md:gap-x-4 gap-y-8">
            {!loading && filters.onlyMyPlatforms && (!profile?.subscribed_platforms || profile.subscribed_platforms.length === 0) ? (
                <div className="col-span-full py-20 text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                        <PlayCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No platforms configured</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        We don't know what platforms you use, please go to your settings and add your subscriptions.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/settings#my-platforms")}>
                        Go to Settings
                    </Button>
                </div>
            ) : (
                <>
                {results.map((item) => {
                const year = new Date(item.release_date || item.first_air_date || "").getFullYear() || "";
                const friendRating = friendRatings[item.id] || item.friend_rating;
                const displayTitle = item.title || item.name;

                return (
                    <div
                    key={item.id}
                    onClick={() => selectMedia(item)}
                    className="group cursor-pointer flex flex-col gap-2"
                    >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-secondary shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.02]">
                        {item.poster_path ? (
                        <img
                            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                            alt={displayTitle}
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                        ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/20">
                            <Film className="h-12 w-12" />
                        </div>
                        )}


                        {/* Prominent Friend Rating */}
                        {friendRating !== undefined && friendRating !== null && (
                            <div className="absolute top-2 right-2 flex items-center justify-center h-9 min-w-[2.5rem] px-2 gap-1 rounded-lg bg-yellow-500 text-black font-bold shadow-lg text-sm backdrop-blur-md">
                                <span>{friendRating.toFixed(1)}</span>
                                <Star className="h-3 w-3 fill-current" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {item.original_title || displayTitle}
                        </h3>
                        {(item.original_title && item.original_title !== displayTitle) && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                            {displayTitle}
                        </div>
                        )}
                        <div className="text-xs text-muted-foreground/80 flex items-center gap-2">
                            <span>{year}</span>
                        </div>
                    </div>
                    </div>
                );
                })}

                {!loading && results.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-3">
                        {filters.watchlistUser && watchlistCount === 0 ? (
                            <>
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                                    <Bookmark className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">Watchlist is empty</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    {filters.watchlistUser === profile?.username
                                        ? "Start building your watchlist with films you'd like to watch!"
                                        : `${filters.watchlistUser} hasn't added any films to their watchlist yet.`}
                                </p>
                                {filters.watchlistUser === profile?.username && (
                                    <Button variant="outline" onClick={() => {
                                        filters.setWatchlistUser(null);
                                        filters.setActiveTab("movies");
                                    }}>
                                        Find movies to add
                                    </Button>
                                )}
                            </>
                        ) : filters.ratedByFriends && friends.length === 0 ? (
                            <>
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                                    <Users className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">No friends followed</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Follow friends to see their ratings and recommendations.
                                </p>
                                <Button onClick={() => filters.setActiveTab("users")}>
                                    Find Friends
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                                    <SearchIcon className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold">No results found</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Try adjusting your filters or search for something else.
                                </p>
                                <Button variant="outline" onClick={() => {
                                    filters.setQuery("");
                                    filters.clearAllFilters();
                                }}>Clear all filters</Button>
                            </>
                        )}
                    </div>
                )}
                </>
            )}

            {/* Load More Button */}
            {!loading && hasMore && results.length > 0 && (
                <div className="col-span-full py-8 text-center">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => loadMore({
                            ...filters,
                            userCountry: profile?.country,
                            userPlatforms: profile?.subscribed_platforms
                        })}
                        className="w-full max-w-xs"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More"}
                    </Button>
                </div>
            )}

            {loading && results.length > 0 && (
                 <div className="col-span-full py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                 </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
