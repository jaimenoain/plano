import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";

export type SortOption = "relevance" | "recency" | "rating_desc" | "rating_asc" | "release_desc" | "release_asc" | "title";

export interface ResolvedIDs {
  watchlist?: string;
  seen?: string;
  notSeen?: string; // "me" context or specific user
  ratedBy?: string[];
  notSeenBy?: string[]; // "users" context
}

export interface Provider {
  id: string;
  name: string;
  logo?: string;
}

export interface SavedViewFilters {
    activeTab: "movies" | "tv" | "users";
    contentTypes: ("movie" | "tv")[];
    sortBy: SortOption;
    selectedGenres: number[];
    selectedDecades: string[];
    selectedRuntimes: string[];
    selectedCountries: string[];
    selectedTags: string[];
    onlyMyPlatforms: boolean;
    availableRentBuy: boolean;
    selectedProviders: Provider[];
    selectedPeople: {id: number, name: string}[];
    watchlistUser: string | null;
    notSeenByUser: string | null;
    seenByUser: string | null;
    minRating: number | null;
    ratedByFriends: boolean;
    friendsMinRating: number | null;
    ratedByUsernames: string[];
    ratedByMode: "any" | "all";
    notSeenByUsernames: string[];
    notSeenByMode: "any" | "all";
}

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  filters: SavedViewFilters;
  is_pinned: boolean;
  created_at: string;
}

export function useSearchFilters(user: User | null, currentUsername: string | null) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // --- Basic State ---
  const initialTab = searchParams.get("tab") as "movies" | "tv" | "users" | null;
  const [activeTab, setActiveTab] = useState<"movies" | "tv" | "users">(initialTab || "movies");

  // --- Content Types State ---
  const [contentTypes, setContentTypes] = useState<("movie" | "tv")[]>(() => {
    const p = searchParams.get("types");
    if (p) return p.split(",") as ("movie" | "tv")[];
    // Fallback: if types not set, derive from activeTab if possible, or default to both
    if (initialTab === "tv") return ["tv"];
    if (initialTab === "movies") return ["movie"];
    return ["movie", "tv"];
  });

  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const initialSort = searchParams.get("sort") as SortOption | null;
  const [sortBy, setSortBy] = useState<SortOption>(initialSort || "relevance");

  // --- Filter State ---
  const [selectedGenres, setSelectedGenres] = useState<number[]>(() => {
    const p = searchParams.get("genres");
    return p ? p.split(",").map(Number) : [];
  });
  const [selectedDecades, setSelectedDecades] = useState<string[]>(() => {
    const p = searchParams.get("decades");
    return p ? p.split(",") : [];
  });
  const [selectedRuntimes, setSelectedRuntimes] = useState<string[]>(() => {
    const p = searchParams.get("runtimes");
    return p ? p.split(",") : [];
  });
  const [selectedCountries, setSelectedCountries] = useState<string[]>(() => {
    const p = searchParams.get("countries");
    return p ? p.split(",") : [];
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const p = searchParams.get("tags");
    return p ? p.split(",") : [];
  });

  // --- Availability State ---
  const [onlyMyPlatforms, setOnlyMyPlatforms] = useState(() => searchParams.get("my_platforms") === "true");
  const [availableRentBuy, setAvailableRentBuy] = useState(() => searchParams.get("rent_buy") === "true");

  // New: Selected Providers
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>(() => {
    const p = searchParams.get("providers");
    if (!p) return [];
    try {
      return p.split(",").map(s => {
        // format: id:name (name might contain colons, so use rest)
        const parts = s.split(":");
        const id = parts[0];
        const name = parts.slice(1).join(":");
        return { id, name }; // logo is lost in URL but can be re-fetched or ignored for display if needed
      });
    } catch { return []; }
  });

  // --- People Filter ---
  const [peopleQuery, setPeopleQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<{id: number, name: string}[]>(() => {
    const p = searchParams.get("people");
    if (!p) return [];
    try {
      return p.split(",").map(s => {
        const [id, ...nameParts] = s.split(":");
        return { id: parseInt(id), name: nameParts.join(":") };
      });
    } catch { return []; }
  });

  // --- User Context Filters (Usernames) ---
  const [watchlistUser, setWatchlistUser] = useState<string | null>(() => {
      const wl = searchParams.get("watchlist");
      if (wl === "true") return null; // Logic handled in effect for "me"
      return wl;
  });

  const [notSeenByUser, setNotSeenByUser] = useState<string | null>(() => {
      const p = searchParams.get("not_seen_user") || searchParams.get("not_seen_me");
      if (p === "true") return null;
      return p;
  });

  const [seenByUser, setSeenByUser] = useState<string | null>(() => {
      const p = searchParams.get("seen_by_user") || searchParams.get("seen_by_me") || searchParams.get("seen_by");
      if (p === "true") return null;
      return p;
  });

  const [ratedByUsernames, setRatedByUsernames] = useState<string[]>(() => {
      const p = searchParams.get("rated_by");
      return p ? p.split(",") : [];
  });
  const [ratedByMode, setRatedByMode] = useState<"any" | "all">(() => (searchParams.get("rated_by_mode") as "any" | "all") || "any");

  const [notSeenByUsernames, setNotSeenByUsernames] = useState<string[]>(() => {
    const p = searchParams.get("not_seen_by_users");
    return p ? p.split(",") : [];
  });
  const [notSeenByMode, setNotSeenByMode] = useState<"any" | "all">(() => (searchParams.get("not_seen_by_mode") as "any" | "all") || "any");

  const [minRating, setMinRating] = useState<number | null>(() => {
    const p = searchParams.get("min_rating");
    return p ? parseInt(p) : null;
  });

  // New: Rated by friends toggle
  const [ratedByFriends, setRatedByFriends] = useState(() => searchParams.get("rated_by_friends") === "true");

  // New: Friends' minimum rating
  const [friendsMinRating, setFriendsMinRating] = useState<number | null>(() => {
      const p = searchParams.get("friends_min_rating");
      return p ? parseInt(p) : null;
  });

  // --- Resolved IDs State ---
  const [resolvedIds, setResolvedIds] = useState<ResolvedIDs>({});

  // --- Saved Views State ---
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [currentViewSnapshot, setCurrentViewSnapshot] = useState<string | null>(null);
  const isApplyingView = useRef(false);

  // --- Helper to get current filters object ---
  const getCurrentFilters = useCallback((): SavedViewFilters => {
    return {
        activeTab,
        contentTypes,
        sortBy,
        selectedGenres: [...selectedGenres].sort((a, b) => a - b),
        selectedDecades: [...selectedDecades].sort(),
        selectedRuntimes: [...selectedRuntimes].sort(),
        selectedCountries: [...selectedCountries].sort(),
        selectedTags: [...selectedTags].sort(),
        onlyMyPlatforms,
        availableRentBuy,
        selectedProviders: [...selectedProviders].sort((a, b) => a.id.localeCompare(b.id)),
        selectedPeople: [...selectedPeople].sort((a, b) => a.id - b.id),
        watchlistUser,
        notSeenByUser,
        seenByUser,
        minRating,
        ratedByFriends,
        friendsMinRating,
        ratedByUsernames: [...ratedByUsernames].sort(),
        ratedByMode,
        notSeenByUsernames: [...notSeenByUsernames].sort(),
        notSeenByMode,
    };
  }, [
      activeTab, contentTypes, sortBy, selectedGenres, selectedDecades, selectedRuntimes,
      selectedCountries, selectedTags, onlyMyPlatforms, availableRentBuy,
      selectedProviders, selectedPeople, watchlistUser, notSeenByUser,
      seenByUser, minRating, ratedByFriends, friendsMinRating,
      ratedByUsernames, ratedByMode, notSeenByUsernames, notSeenByMode
  ]);

  // --- Saved Views Logic ---

  const fetchSavedViews = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('saved_views')
      .select('*')
      .order('is_pinned', { ascending: false }) // Pinned first
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching saved views:", error);
    } else {
      // Need to cast the filters jsonb to SavedViewFilters
      const formattedData = (data as any[]).map(v => ({
          ...v,
          filters: v.filters as SavedViewFilters
      }));
      setSavedViews(formattedData);
      return formattedData;
    }
  }, [user]);

  const saveView = async (name: string) => {
    if (!user) return;
    const filters = getCurrentFilters();

    const { data, error } = await supabase
      .from('saved_views')
      .insert({
        user_id: user.id,
        name,
        filters: filters as any, // Cast for Supabase type check compatibility if needed
      })
      .select()
      .single();

    if (error) {
      toast({
          title: "Error saving view",
          description: error.message,
          variant: "destructive",
      });
    } else {
      toast({
          title: "View saved",
          description: `"${name}" has been saved to your views.`,
      });
      fetchSavedViews();
      // Apply the new view so it becomes active
      const newView = { ...data, filters: data.filters as SavedViewFilters };
      applyView(newView);
    }
  };

  const deleteView = async (id: string) => {
    const { error } = await supabase.from('saved_views').delete().eq('id', id);
    if (error) {
      toast({
          title: "Error deleting view",
          description: error.message,
          variant: "destructive",
      });
    } else {
      toast({
          title: "View deleted",
          description: "The view has been removed.",
      });
      fetchSavedViews();
      if (activeViewId === id) {
          setActiveViewId(null);
          setCurrentViewSnapshot(null);
      }
    }
  };

  const pinView = async (id: string) => {
      // First unpin all (or rely on unique index failure? Unique index fails, so we must unpin first)
      // Actually, updating with `is_pinned: true` will fail if another is pinned.
      // So we must unpin all first.
      if (!user) return;

      // Optimistic update
      setSavedViews(prev => prev.map(v => ({ ...v, is_pinned: v.id === id })));

      const { error: unpinError } = await supabase
          .from('saved_views')
          .update({ is_pinned: false })
          .eq('user_id', user.id)
          .neq('id', id);

      await supabase.from('saved_views').update({ is_pinned: false }).eq('user_id', user.id);

      const { error } = await supabase
          .from('saved_views')
          .update({ is_pinned: true })
          .eq('id', id);

      if (error) {
          toast({
              title: "Error pinning view",
              description: error.message,
              variant: "destructive",
          });
          fetchSavedViews(); // Revert
      } else {
          fetchSavedViews();
      }
  };

  const applyView = (view: SavedView) => {
    isApplyingView.current = true;

    // Set all state
    const f = view.filters;
    setActiveTab(f.activeTab);
    // Backward compatibility for saved views without contentTypes
    if (f.contentTypes) {
        setContentTypes(f.contentTypes);
    } else {
        // Fallback based on activeTab
        if (f.activeTab === "movies") setContentTypes(["movie"]);
        else if (f.activeTab === "tv") setContentTypes(["tv"]);
        else setContentTypes(["movie", "tv"]);
    }
    setSortBy(f.sortBy);
    setSelectedGenres(f.selectedGenres);
    setSelectedDecades(f.selectedDecades);
    setSelectedRuntimes(f.selectedRuntimes);
    setSelectedCountries(f.selectedCountries);
    setSelectedTags(f.selectedTags);
    setOnlyMyPlatforms(f.onlyMyPlatforms);
    setAvailableRentBuy(f.availableRentBuy);
    setSelectedProviders(f.selectedProviders);
    setSelectedPeople(f.selectedPeople);
    setWatchlistUser(f.watchlistUser);
    setNotSeenByUser(f.notSeenByUser);
    setSeenByUser(f.seenByUser);
    setMinRating(f.minRating);
    setRatedByFriends(f.ratedByFriends);
    setFriendsMinRating(f.friendsMinRating);
    setRatedByUsernames(f.ratedByUsernames);
    setRatedByMode(f.ratedByMode);
    setNotSeenByUsernames(f.notSeenByUsernames);
    setNotSeenByMode(f.notSeenByMode);

    setActiveViewId(view.id);
    // Create snapshot for comparison (must match getCurrentFilters structure)
    // We can assume the view.filters is already clean, but let's re-sort to be safe/consistent
    const snapshot = {
        ...f,
        contentTypes: f.contentTypes ? [...f.contentTypes].sort() : (f.activeTab === "movies" ? ["movie"] : f.activeTab === "tv" ? ["tv"] : ["movie", "tv"]),
        selectedGenres: [...f.selectedGenres].sort((a, b) => a - b),
        selectedDecades: [...f.selectedDecades].sort(),
        selectedRuntimes: [...f.selectedRuntimes].sort(),
        selectedCountries: [...f.selectedCountries].sort(),
        selectedTags: [...f.selectedTags].sort(),
        selectedProviders: [...f.selectedProviders].sort((a, b) => a.id.localeCompare(b.id)),
        selectedPeople: [...f.selectedPeople].sort((a, b) => a.id - b.id),
        ratedByUsernames: [...f.ratedByUsernames].sort(),
        notSeenByUsernames: [...f.notSeenByUsernames].sort(),
    };
    setCurrentViewSnapshot(JSON.stringify(snapshot));

    // Reset flag after a tick to allow effects to run
    setTimeout(() => {
        isApplyingView.current = false;
    }, 100);
  };

  // --- Initial Fetch and Auto-Apply ---
  useEffect(() => {
      if (!user) return;

      const init = async () => {
          const views = await fetchSavedViews();

          const params = new URLSearchParams(window.location.search);
          const filterKeys = ["genres", "decades", "runtimes", "countries", "tags", "people", "providers", "watchlist", "not_seen_user", "seen_by_user", "min_rating", "rated_by_friends", "my_platforms", "rent_buy", "rated_by", "not_seen_by_users", "not_seen_me", "seen_by_me", "seen_by", "types"];
          const hasFilters = filterKeys.some(k => params.has(k));

          if (!hasFilters && views) {
              const pinned = views.find((v: SavedView) => v.is_pinned);
              if (pinned) {
                  applyView(pinned);
              }
          }
      };

      init();
  }, [user]);

  // --- Detect Changes / Custom State ---
  useEffect(() => {
      if (!activeViewId || !currentViewSnapshot || isApplyingView.current) return;

      const current = getCurrentFilters();
      // Ensure contentTypes is sorted for comparison
      const currentSnapshotObj = {
          ...current,
          contentTypes: [...current.contentTypes].sort()
      };
      const currentString = JSON.stringify(currentSnapshotObj);

      if (currentString !== currentViewSnapshot) {
          setActiveViewId(null);
          setCurrentViewSnapshot(null);
      }
  }, [
      // Dependency on all filter values (via getCurrentFilters return)
      activeTab, contentTypes, sortBy, selectedGenres, selectedDecades, selectedRuntimes,
      selectedCountries, selectedTags, onlyMyPlatforms, availableRentBuy,
      selectedProviders, selectedPeople, watchlistUser, notSeenByUser,
      seenByUser, minRating, ratedByFriends, friendsMinRating,
      ratedByUsernames, ratedByMode, notSeenByUsernames, notSeenByMode,
      activeViewId, currentViewSnapshot
  ]);

  // --- Derived State Helpers ---
  // Legacy/Boolean fallback check logic handling "true" -> currentUsername
  useEffect(() => {
      if (!currentUsername) return;

      const wl = searchParams.get("watchlist");
      if (wl === "true" && !watchlistUser) setWatchlistUser(currentUsername);

      const nsm = searchParams.get("not_seen_me");
      if (nsm === "true" && !notSeenByUser) setNotSeenByUser(currentUsername);

      const sbm = searchParams.get("seen_by_me");
      if (sbm === "true" && !seenByUser) setSeenByUser(currentUsername);

  }, [searchParams, currentUsername]);

  // --- Sync State to URL ---
  useEffect(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);

      newParams.set("tab", activeTab);

      // Sync types
      // Only set types if we are in content mode (not users)
      if (activeTab !== "users") {
          if (contentTypes.length > 0 && contentTypes.length < 2) {
               newParams.set("types", contentTypes.join(","));
          } else if (contentTypes.length === 2) {
               // If default (both), we can choose to omit or set explicitly.
               // Let's omit to keep URL clean if it matches default behavior?
               // Or set explicitly to ensure clarity.
               // Existing logic: "movies" tab implies movie.
               // We should probably set types=movie,tv if user explicitly selected both.
               // But default is both.
               newParams.delete("types");
          } else {
               newParams.delete("types");
          }
      } else {
          newParams.delete("types");
      }

      if (query) newParams.set("q", query); else newParams.delete("q");
      if (sortBy) newParams.set("sort", sortBy); else newParams.delete("sort");

      if (selectedGenres.length > 0) newParams.set("genres", selectedGenres.join(",")); else newParams.delete("genres");
      if (selectedDecades.length > 0) newParams.set("decades", selectedDecades.join(",")); else newParams.delete("decades");
      if (selectedRuntimes.length > 0) newParams.set("runtimes", selectedRuntimes.join(",")); else newParams.delete("runtimes");
      if (selectedCountries.length > 0) newParams.set("countries", selectedCountries.join(",")); else newParams.delete("countries");
      if (selectedTags.length > 0) newParams.set("tags", selectedTags.join(",")); else newParams.delete("tags");

      if (selectedPeople.length > 0) {
        newParams.set("people", selectedPeople.map(p => `${p.id}:${p.name}`).join(","));
      } else newParams.delete("people");

      if (selectedProviders.length > 0) {
        newParams.set("providers", selectedProviders.map(p => `${p.id}:${p.name}`).join(","));
      } else newParams.delete("providers");

      if (watchlistUser) newParams.set("watchlist", watchlistUser); else newParams.delete("watchlist");

      if (notSeenByUser) newParams.set("not_seen_user", notSeenByUser);
      else {
          newParams.delete("not_seen_user");
          newParams.delete("not_seen_me");
      }

      if (seenByUser) newParams.set("seen_by_user", seenByUser);
      else {
          newParams.delete("seen_by_user");
          newParams.delete("seen_by_me");
          newParams.delete("seen_by");
      }

      if (minRating) newParams.set("min_rating", minRating.toString()); else newParams.delete("min_rating");

      if (ratedByFriends) newParams.set("rated_by_friends", "true"); else newParams.delete("rated_by_friends");
      if (friendsMinRating) newParams.set("friends_min_rating", friendsMinRating.toString()); else newParams.delete("friends_min_rating");

      if (onlyMyPlatforms) newParams.set("my_platforms", "true"); else newParams.delete("my_platforms");
      if (availableRentBuy) newParams.set("rent_buy", "true"); else newParams.delete("rent_buy");

      if (ratedByUsernames.length > 0) newParams.set("rated_by", ratedByUsernames.join(",")); else newParams.delete("rated_by");
      if (ratedByMode !== "any") newParams.set("rated_by_mode", ratedByMode); else newParams.delete("rated_by_mode");

      if (notSeenByUsernames.length > 0) newParams.set("not_seen_by_users", notSeenByUsernames.join(",")); else newParams.delete("not_seen_by_users");
      if (notSeenByMode !== "any") newParams.set("not_seen_by_mode", notSeenByMode); else newParams.delete("not_seen_by_mode");

      return newParams;
    });
  }, [
    activeTab, contentTypes, query, sortBy, selectedGenres, selectedDecades, selectedRuntimes,
    selectedCountries, selectedPeople, watchlistUser, notSeenByUser, seenByUser,
    ratedByUsernames, ratedByMode, notSeenByUsernames, notSeenByMode, selectedTags,
    onlyMyPlatforms, availableRentBuy, selectedProviders, minRating, ratedByFriends, friendsMinRating, setSearchParams
  ]);

  // --- Username Resolution Effect ---
  useEffect(() => {
      const resolveUsers = async () => {
          const usernamesToResolve = new Set<string>();
          if (watchlistUser) usernamesToResolve.add(watchlistUser);
          if (seenByUser) usernamesToResolve.add(seenByUser);
          if (notSeenByUser) usernamesToResolve.add(notSeenByUser);
          ratedByUsernames.forEach(u => usernamesToResolve.add(u));
          notSeenByUsernames.forEach(u => usernamesToResolve.add(u));

          if (usernamesToResolve.size === 0) {
              setResolvedIds({});
              return;
          }

          try {
              const { data } = await supabase
                  .from("profiles")
                  .select("id, username")
                  .in("username", Array.from(usernamesToResolve));

              const map = new Map(data?.map(u => [u.username, u.id]));

              setResolvedIds({
                  watchlist: watchlistUser ? map.get(watchlistUser) : undefined,
                  seen: seenByUser ? map.get(seenByUser) : undefined,
                  notSeen: notSeenByUser ? map.get(notSeenByUser) : undefined,
                  ratedBy: ratedByUsernames.map(u => map.get(u)).filter(Boolean) as string[],
                  notSeenBy: notSeenByUsernames.map(u => map.get(u)).filter(Boolean) as string[],
              });
          } catch (e) {
              console.error("Error resolving usernames", e);
          }
      };

      const t = setTimeout(resolveUsers, 300);
      return () => clearTimeout(t);
  }, [watchlistUser, seenByUser, notSeenByUser, ratedByUsernames, notSeenByUsernames]);

  const clearAllFilters = () => {
      setSelectedGenres([]);
      setSelectedCountries([]);
      setSelectedDecades([]);
      setSelectedRuntimes([]);
      setSelectedPeople([]);
      setWatchlistUser(null);
      setNotSeenByUser(null);
      setSeenByUser(null);
      setMinRating(null);
      setRatedByFriends(false);
      setFriendsMinRating(null);
      setRatedByUsernames([]);
      setNotSeenByUsernames([]);
      setSelectedTags([]);
      setPeopleQuery("");
      setOnlyMyPlatforms(false);
      setAvailableRentBuy(false);
      setSelectedProviders([]);
  };

  return {
    activeTab, setActiveTab,
    contentTypes, setContentTypes,
    query, setQuery,
    sortBy, setSortBy,
    selectedGenres, setSelectedGenres,
    selectedDecades, setSelectedDecades,
    selectedRuntimes, setSelectedRuntimes,
    selectedCountries, setSelectedCountries,
    selectedTags, setSelectedTags,
    onlyMyPlatforms, setOnlyMyPlatforms,
    availableRentBuy, setAvailableRentBuy,
    selectedProviders, setSelectedProviders,
    peopleQuery, setPeopleQuery,
    selectedPeople, setSelectedPeople,
    watchlistUser, setWatchlistUser,
    notSeenByUser, setNotSeenByUser,
    seenByUser, setSeenByUser,
    ratedByUsernames, setRatedByUsernames,
    ratedByMode, setRatedByMode,
    notSeenByUsernames, setNotSeenByUsernames,
    notSeenByMode, setNotSeenByMode,
    minRating, setMinRating,
    ratedByFriends, setRatedByFriends,
    friendsMinRating, setFriendsMinRating,
    resolvedIds,
    clearAllFilters,
    // Saved Views
    savedViews,
    activeViewId,
    saveView,
    deleteView,
    pinView,
    applyView,
  };
}
