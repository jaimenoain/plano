import { useState, useEffect, useMemo, ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  Settings, LogOut, Film, Bookmark, Loader2, 
  MoreVertical, Heart, Filter, Star, ArrowRight,
  Search, X, Share2, Edit2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ReviewCard } from "@/components/feed/ReviewCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FollowButton } from "@/components/FollowButton";
import { useToast } from "@/hooks/use-toast";
import { FavoritesSection } from "@/components/profile/FavoritesSection";
import { ManageFavoritesDialog } from "@/components/profile/ManageFavoritesDialog";
import { ManageTagsDialog } from "@/components/profile/ManageTagsDialog";
import { FavoriteItem } from "@/components/profile/types";
import { RecommendationCard, RecommendationInteraction } from "@/components/profile/RecommendationCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { MetaHead } from "@/components/common/MetaHead";

// New Components
import { UserCard } from "@/components/profile/UserCard";
import { ProfileHighlights } from "@/components/profile/ProfileHighlights";
import { ManageHighlightsDialog } from "@/components/profile/ManageHighlightsDialog";
import { CollectionsRow } from "@/components/profile/CollectionsRow";

// --- Types ---
interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  last_online?: string | null;
}

interface Stats {
  reviews: number;
  watchlist: number;
  followers: number;
  following: number;
}

interface FeedReview {
  id: string;
  content: string | null;
  rating: number | null;
  created_at: string;
  edited_at?: string | null;
  status?: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  film: {
    id: string | number;
    title: string;
    original_title?: string | null;
    poster_path: string | null;
    genres?: number[];
    genre_ids?: number[];
    tmdb_id?: number;
    media_type?: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  tags?: string[];
  watch_with_users?: { id: string, avatar_url: string | null, username: string | null }[];
}

interface UserListItem {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_following: boolean;
  is_follower: boolean;
}

interface EnrichedRecommendation {
    id: string;
    film: {
        id: string;
        title: string;
        tmdb_id: number;
        poster_path: string | null;
        media_type: string;
        release_date: string | null;
    };
    recommender: {
        username: string | null;
        avatar_url: string | null;
    };
    created_at: string;
    interaction: RecommendationInteraction;
}

export default function Profile() {
  const { user: currentUser, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ reviews: 0, watchlist: 0, followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  // URL-derived state
  const activeTab = (searchParams.get("tab") as "reviews" | "watchlist" | "foryou") || "reviews";
  const searchQuery = searchParams.get("search") || "";
  const selectedTag = searchParams.get("tag");

  const [loading, setLoading] = useState(true);
  
  const [content, setContent] = useState<FeedReview[]>([]);
  const [recommendations, setRecommendations] = useState<EnrichedRecommendation[]>([]);
  const [pendingRecsCount, setPendingRecsCount] = useState(0);
  const [contentLoading, setContentLoading] = useState(false);

  // Recommendation Filters
  const [showWatched, setShowWatched] = useState(true);
  const [showWatchlisted, setShowWatchlisted] = useState(true);

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showManageFavorites, setShowManageFavorites] = useState(false);
  const [showManageHighlights, setShowManageHighlights] = useState(false);
  const [showManageTags, setShowManageTags] = useState(false);

  // New Profile Features
  const [squad, setSquad] = useState<Profile[]>([]);

  const [userListDialog, setUserListDialog] = useState<{ open: boolean; type: "followers" | "following" }>({
    open: false,
    type: "followers"
  });
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);

  const isOwnProfile = currentUser?.id === targetUserId;

  // --- Handlers for URL State ---

  const handleTabChange = (tab: string, shouldScroll = false) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    newParams.delete("search");
    newParams.delete("tag");
    setSearchParams(newParams, { replace: true, preventScrollReset: true });

    requestAnimationFrame(() => {
      const tabsSection = document.getElementById('profile-content-tabs');
      if (tabsSection) {
        const rect = tabsSection.getBoundingClientRect();
        // 64px (header height)
        if (shouldScroll || rect.top < 64) {
          const behavior = shouldScroll ? 'smooth' : 'auto';
          tabsSection.scrollIntoView({ behavior, block: 'start' });
        }
      }
    });
  };

  const handleSearchChange = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set("search", query);
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleTagChange = (tag: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (tag) {
      newParams.set("tag", tag);
    } else {
      newParams.delete("tag");
    }
    setSearchParams(newParams, { replace: true, preventScrollReset: true });

    requestAnimationFrame(() => {
        const element = document.getElementById('tags-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
  };

  const handleShare = () => {
    let url = window.location.href;
    if (profile?.username) {
      const urlObj = new URL(window.location.href);
      urlObj.pathname = `/profile/${profile.username.toLowerCase()}`;
      url = urlObj.toString();
    }
    navigator.clipboard.writeText(url);
    toast({
      description: "Link copied to clipboard.",
    });
  };

  // --- Effects ---

  useEffect(() => {
    if (!authLoading && !currentUser && !routeUsername) {
      navigate("/auth");
    }
  }, [currentUser, authLoading, navigate, routeUsername]);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      let uid: string | null = null;

      let query = supabase.from("profiles").select("id, username, avatar_url, bio, favorites, last_online");
      let data: any = null;

      if (routeUsername) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeUsername);
        
        if (isUuid) {
          query = query.eq("id", routeUsername);
        } else {
          query = query.ilike("username", routeUsername);
        }

        const res = await query.maybeSingle();
        data = res.data;

        if (data) {
          if (isUuid && data.username) {
            navigate(`/profile/${data.username.toLowerCase()}`, { replace: true });
            return;
          }
          if (!isUuid && routeUsername && routeUsername !== routeUsername.toLowerCase()) {
             navigate(`/profile/${routeUsername.toLowerCase()}`, { replace: true });
             return;
          }
        }
      } else if (currentUser) {
        uid = currentUser.id;
        const res = await supabase
          .from("profiles")
          .select("id, username, avatar_url, bio, favorites, last_online")
          .eq("id", uid)
          .maybeSingle();
        data = res.data;
      }

      if (data) {
          setProfile(data);
          uid = data.id;
          let favs = (data as any).favorites || [];

          // Hydrate logic: fetch ratings only for FILMS
          const filmFavs = favs.filter((f: any) => !f.type || f.type === 'film');
          const missingDataIds = filmFavs.map((f: any) => f.id);

          if (missingDataIds.length > 0) {
            const { data: userRatings } = await supabase
              .from("log")
              .select("id, rating, film:films!inner(tmdb_id, media_type, backdrop_path)")
              .eq("user_id", data.id)
              .in("film.tmdb_id", missingDataIds)
              .not("rating", "is", null);

            if (userRatings) {
              const infoMap = new Map();
              userRatings.forEach((log: any) => {
                const film = Array.isArray(log.film) ? log.film[0] : log.film;
                if (film && film.tmdb_id) {
                  infoMap.set(`${film.media_type}-${film.tmdb_id}`, {
                    id: log.id,
                    rating: log.rating,
                    backdrop_path: film.backdrop_path
                  });
                }
              });

              favs = favs.map((f: any) => {
                  if (f.type && f.type !== 'film') return f; // Skip non-films
                  const info = infoMap.get(`${f.media_type}-${f.id}`) || infoMap.get(`movie-${f.id}`) || infoMap.get(`tv-${f.id}`);
                  return {
                    ...f,
                    rating: f.rating ?? info?.rating,
                    backdrop_path: f.backdrop_path ?? info?.backdrop_path,
                    reviewId: info?.id,
                    username: data.username
                  };
              });
            }
          }
          setFavorites(favs);
      }

      setTargetUserId(uid);
      setLoading(false);
    };

    fetchProfileData();
  }, [routeUsername, currentUser, navigate]);

  useEffect(() => {
    if (targetUserId) {
      fetchStats();
      checkIfFollowing();
      fetchTabContent();
      fetchSquad();
    }
  }, [targetUserId, activeTab, currentUser]);

  // --- Logic ---

  // Computed: Unique Tags
  const tags = useMemo(() => {
    const tagMap = new Map<string, number>();
    content.forEach(item => {
      item.tags?.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    const sortedByFreq = Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    return sortedByFreq;
  }, [content]);

  // Computed: Filtered Content
  const filteredContent = useMemo(() => {
    return content.filter(item => {
      const matchesSearch = searchQuery === "" ||
        item.film.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.film.original_title && item.film.original_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = selectedTag === null || item.tags?.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [content, searchQuery, selectedTag]);

  // Computed: Filtered Recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
        if (!showWatched && rec.interaction.status === 'watched') return false;
        if (!showWatchlisted && rec.interaction.status === 'watchlist') return false;
        return true;
    });
  }, [recommendations, showWatched, showWatchlisted]);

  const checkIfFollowing = async () => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) return;
    const { data } = await supabase.from("follows").select("*").eq("follower_id", currentUser.id).eq("following_id", targetUserId).maybeSingle();
    setIsFollowing(!!data);
  };

  const fetchStats = async () => {
    if (!targetUserId) return;
    const [reviewsResult, watchlistResult, followersResult, followingResult] = await Promise.all([
      supabase.from("log").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("status", "watched"),
      supabase.from("log").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("status", "watchlist"),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", targetUserId),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", targetUserId),
    ]);

    setStats({
      reviews: reviewsResult.count || 0,
      watchlist: watchlistResult.count || 0,
      followers: followersResult.count || 0,
      following: followingResult.count || 0,
    });

    if (isOwnProfile) {
        const { count } = await supabase.from("recommendations")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", targetUserId)
            .eq("status", "pending");
        setPendingRecsCount(count || 0);
    }
  };

  const fetchSquad = async () => {
      if (!targetUserId || !isOwnProfile) return;
      const { data } = await supabase
          .from("follows")
          .select("following:profiles!follows_following_id_fkey(id, username, avatar_url)")
          .eq("follower_id", targetUserId)
          .limit(5);

      if (data) {
          const squadMembers = data.map((d: any) => d.following).filter(Boolean);
          setSquad(squadMembers);
      }
  }

  const fetchTabContent = async () => {
    if (!targetUserId) return;
    setContentLoading(true);

    try {
      if (activeTab === "foryou") {
        if (!isOwnProfile) {
            setContentLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from("recommendations")
            .select(`
                id, created_at, status,
                film:films ( id, title, tmdb_id, poster_path, media_type, release_date ),
                recommender:profiles!recommendations_recommender_id_fkey ( username, avatar_url )
            `)
            .eq("recipient_id", targetUserId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) throw error;

        const filmIds = data?.map(d => d.film.id) || [];
        const { data: logs } = await supabase
            .from("log")
            .select("film_id, status, rating")
            .eq("user_id", targetUserId)
            .in("film_id", filmIds);

        const logMap = new Map();
        logs?.forEach(log => {
            logMap.set(log.film_id, { status: log.status, rating: log.rating });
        });

        const enrichedRecs = (data || []).map(rec => ({
            ...rec,
            interaction: logMap.get(rec.film.id) || { status: null, rating: null }
        }));

        setRecommendations(enrichedRecs);
      } else {
        const status = activeTab === "reviews" ? "watched" : "watchlist";
        const { data: logsData, error: logsError } = await supabase
            .from("log")
            .select(`
            id, content, rating, created_at, edited_at, user_id, film_id, tags, status,
            film:films ( id, title, original_title, poster_path, genre_ids, tmdb_id, media_type )
            `)
            .eq("user_id", targetUserId)
            .eq("status", status)
            .order("edited_at", { ascending: false });

        if (logsError) throw logsError;

        if (!logsData || logsData.length === 0) {
            setContent([]);
            return;
        }

        const logIds = logsData.map((r) => r.id);
        const [likesResult, commentsResult, userLikesResult] = await Promise.all([
            supabase.from("likes").select("interaction_id").in("interaction_id", logIds),
            supabase.from("comments").select("interaction_id").in("interaction_id", logIds),
            currentUser ? supabase.from("likes").select("interaction_id").in("interaction_id", logIds).eq("user_id", currentUser.id) : Promise.resolve({ data: [] }),
        ]);

        const likesCount = new Map();
        likesResult.data?.forEach(l => likesCount.set(l.interaction_id, (likesCount.get(l.interaction_id) || 0) + 1));

        const commentsCount = new Map();
        commentsResult.data?.forEach(c => commentsCount.set(c.interaction_id, (commentsCount.get(c.interaction_id) || 0) + 1));

        const userLikes = new Set(userLikesResult.data?.map(l => l.interaction_id));

        const watchWithMap = new Map();
        if (activeTab === "watchlist") {
             const { data: recData } = await supabase
                .from("recommendations")
                .select(`
                    film_id,
                    recipient:profiles!recommendations_recipient_id_fkey(id, username, avatar_url)
                `)
                .eq("recommender_id", targetUserId)
                .eq("status", "watch_with");

             if (recData) {
                 recData.forEach((rec: any) => {
                     const existing = watchWithMap.get(rec.film_id) || [];
                     if (rec.recipient) existing.push(rec.recipient);
                     watchWithMap.set(rec.film_id, existing);
                 });
             }
        }

        const formattedContent: FeedReview[] = logsData.map((item: any) => {
            const filmData = Array.isArray(item.film) ? item.film[0] : item.film;
            const watchWith = watchWithMap.get(item.film_id);

            return {
            id: item.id,
            content: item.content,
            rating: item.rating,
            created_at: item.created_at,
            edited_at: item.edited_at,
            status: item.status,
            user: { username: profile?.username || "Unknown", avatar_url: profile?.avatar_url || null },
            film: {
                id: filmData?.id || item.film_id,
                title: filmData?.title || "Unknown Film",
                original_title: filmData?.original_title || null,
                poster_path: filmData?.poster_path || null,
                genre_ids: filmData?.genre_ids || [],
                tmdb_id: filmData?.tmdb_id,
                media_type: filmData?.media_type,
            },
            tags: item.tags || [],
            likes_count: likesCount.get(item.id) || 0,
            comments_count: commentsCount.get(item.id) || 0,
            is_liked: userLikes.has(item.id),
            watch_with_users: watchWith,
            };
        });

        setContent(formattedContent);
      }

    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setContentLoading(false);
    }
  };

  const handleRecommendationAction = async (id: string, action: 'dismiss') => {
      if (action === 'dismiss') {
          setRecommendations(prev => prev.filter(r => r.id !== id));
          await supabase.from("recommendations").update({ status: 'ignored' }).eq("id", id);
          toast({ description: "Recommendation dismissed." });
          setPendingRecsCount(prev => Math.max(0, prev - 1));
      }
  };

  const handleRateFilm = (film: any) => {
      navigate(`/post?movieId=${film.tmdb_id}&mediaType=${film.media_type || 'movie'}&title=${encodeURIComponent(film.title)}&poster=${film.poster_path}`);
  };

  const handleWatchlistFilm = async (film: any) => {
      if (!currentUser) return;
      try {
          const { error } = await supabase.from("log").upsert({
              user_id: currentUser.id,
              film_id: film.id,
              status: "watchlist"
          }, { onConflict: "user_id, film_id" });
          if (error) throw error;
          navigate(`/post?type=watchlist&movieId=${film.tmdb_id}&mediaType=${film.media_type || 'movie'}&title=${encodeURIComponent(film.title)}&poster=${film.poster_path}`);
      } catch (error) {
          console.error("Error adding to watchlist:", error);
          toast({ variant: "destructive", description: "Failed to add to watchlist." });
      }
  };

  const handleLike = async (reviewId: string) => {
    if (!currentUser) return;
    const item = content.find((r) => r.id === reviewId);
    if (!item) return;

    setContent((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, is_liked: !r.is_liked, likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1 }
          : r
      )
    );

    try {
      if (item.is_liked) {
        await supabase.from("likes").delete().eq("interaction_id", reviewId).eq("user_id", currentUser.id);
      } else {
        await supabase.from("likes").insert({ interaction_id: reviewId, user_id: currentUser.id });
      }
    } catch (error) { console.error(error); }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !targetUserId) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", targetUserId);
      setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: targetUserId });
      setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
    }
    setIsFollowing(!isFollowing);
  };

  // --- Favorites Handlers ---

  const handleSaveFavorites = async (newFilmFavorites: FavoriteItem[]) => {
      if (!currentUser) return;
      // Merge with non-film favorites
      const nonFilmFavorites = favorites.filter(f => f.type && f.type !== 'film');
      const combined = [...newFilmFavorites, ...nonFilmFavorites];
      setFavorites(combined);

      try {
          const { error } = await supabase
            .from("profiles")
            .update({ favorites: combined as any })
            .eq("id", currentUser.id);
          if (error) throw error;
          toast({ description: "Favorites updated successfully." });
      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", description: "Failed to save favorites." });
      }
  };

  const handleSaveHighlights = async (newHighlights: FavoriteItem[]) => {
      if (!currentUser) return;
      // Merge with film favorites
      const filmFavorites = favorites.filter(f => !f.type || f.type === 'film');
      const combined = [...filmFavorites, ...newHighlights];
      setFavorites(combined);

      try {
          const { error } = await supabase
            .from("profiles")
            .update({ favorites: combined as any })
            .eq("id", currentUser.id);
          if (error) throw error;
          toast({ description: "Highlights updated successfully." });
      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", description: "Failed to save highlights." });
      }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const openUserList = async (type: "followers" | "following") => {
    setUserListDialog({ open: true, type });
    setUserListLoading(true);
    setUserList([]);
    if (!targetUserId) return;
    try {
      let ids: string[] = [];
      if (type === "followers") {
        const { data } = await supabase.from("follows").select("follower_id").eq("following_id", targetUserId);
        ids = data?.map(f => f.follower_id) || [];
      } else {
        const { data } = await supabase.from("follows").select("following_id").eq("follower_id", targetUserId);
        ids = data?.map(f => f.following_id) || [];
      }
      
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
        let formattedUsers: UserListItem[] = [];
        if (profiles && currentUser) {
            const [myFollowingResult, myFollowersResult] = await Promise.all([
                supabase.from("follows").select("following_id").eq("follower_id", currentUser.id).in("following_id", ids),
                supabase.from("follows").select("follower_id").eq("following_id", currentUser.id).in("follower_id", ids)
            ]);
            const myFollowingIds = new Set(myFollowingResult.data?.map(f => f.following_id));
            const myFollowerIds = new Set(myFollowersResult.data?.map(f => f.follower_id));
            formattedUsers = profiles.map(p => ({
                ...p,
                is_following: myFollowingIds.has(p.id),
                is_follower: myFollowerIds.has(p.id)
            }));
            formattedUsers.sort((a, b) => {
                if (a.is_following && !b.is_following) return -1;
                if (!a.is_following && b.is_following) return 1;
                if (a.is_follower && !b.is_follower) return -1;
                if (!a.is_follower && b.is_follower) return 1;
                return (a.username || "").localeCompare(b.username || "");
            });
        } else {
            formattedUsers = profiles?.map(p => ({ ...p, is_following: false, is_follower: false })) || [];
        }
        setUserList(formattedUsers);
      }
    } catch (error) { console.error(error); } 
    finally { setUserListLoading(false); }
  };

  // --- Render Helpers ---

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile && !loading) {
      return (
          <AppLayout title="User Not Found" showLogo={false} showBack>
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                  <div className="bg-secondary/50 p-6 rounded-full mb-6">
                      <LogOut className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">User Unavailable</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                      This profile is not available. The user might have been deleted, suspended, or does not exist.
                  </p>
                  <Button onClick={() => navigate("/")}>Go Home</Button>
              </div>
          </AppLayout>
      )
  }

  // Filter only film favorites for the FavoritesSection
  const filmFavorites = favorites.filter(f => !f.type || f.type === 'film');

  const avatarUrl = profile?.avatar_url
    ? (profile.avatar_url.startsWith("http")
        ? profile.avatar_url
        : supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl)
    : undefined;

  return (
    <AppLayout title={profile?.username || "Profile"} showLogo={false} showBack={!isOwnProfile}>
      <MetaHead
        title={`${profile?.username} (@${profile?.username})`}
        description={profile?.bio || `Check out ${profile?.username}'s reviews and watchlist on Cineforum.`}
        image={avatarUrl}
      />
      
      {/* 1. Header & User Card */}
      <UserCard
        profile={profile}
        stats={stats}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        onFollowToggle={handleFollowToggle}
        onSignOut={handleSignOut}
        onOpenUserList={openUserList}
        onTabChange={(tab) => handleTabChange(tab, true)}
        squad={squad}
      />

      {/* 2. Favorite Films (Moved to body as requested implicitly by "Add a section") */}
      {/* Only show if not empty or if own profile (to empty state manageable) */}
      {(filmFavorites.length > 0 || isOwnProfile) && (
         <FavoritesSection
            favorites={filmFavorites}
            isOwnProfile={isOwnProfile}
            onManage={() => setShowManageFavorites(true)}
         />
      )}

      {/* 3. Highlights (Genres, People, Quotes) */}
      <ProfileHighlights
         favorites={favorites}
         isOwnProfile={isOwnProfile}
         onManage={() => setShowManageHighlights(true)}
      />

      {/* 4. Collections Row (Tags) */}
      {tags.length > 0 && (
          <div id="tags-section" className="scroll-mt-24">
              <CollectionsRow
                tags={tags}
                selectedTag={selectedTag}
                onTagSelect={handleTagChange}
                onShare={handleShare}
                onManageTags={isOwnProfile ? () => setShowManageTags(true) : undefined}
                isOwnProfile={isOwnProfile}
              />
          </div>
      )}

      {/* 5. Content Tabs */}
      <div className="px-4 mt-2 scroll-mt-20 min-h-screen" id="profile-content-tabs">
        <Tabs value={activeTab} onValueChange={(v: string) => handleTabChange(v)} className="w-full">
          <div className="sticky top-14 bg-background z-10 pt-2 pb-4 space-y-3 shadow-sm border-b border-border/40 -mx-4 px-4 mb-4">
            <div className="flex items-center justify-between">
              <TabsList className={cn("grid w-full max-w-[200px]", isOwnProfile && pendingRecsCount > 0 ? "grid-cols-3 max-w-[300px]" : "grid-cols-2")}>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
                {isOwnProfile && pendingRecsCount > 0 && <TabsTrigger value="foryou">For You</TabsTrigger>}
              </TabsList>
            </div>

            {/* Search Input */}
            {activeTab !== "foryou" && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search reviews..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9 bg-secondary/50 border-transparent focus:bg-background transition-colors"
                    />
                    {searchQuery && (
                        <button onClick={() => handleSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="shrink-0"
                    onClick={() => navigate(`/search?rated_by=${profile?.username || ""}`)}
                    title="Filter by rated films"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
            )}

             {/* For You Filters */}
             {activeTab === "foryou" && (
                <div className="flex items-center gap-4 py-1">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-watched" checked={showWatched} onCheckedChange={(c) => setShowWatched(!!c)} />
                        <Label htmlFor="show-watched" className="text-sm font-normal text-muted-foreground">Show watched</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-watchlisted" checked={showWatchlisted} onCheckedChange={(c) => setShowWatchlisted(!!c)} />
                        <Label htmlFor="show-watchlisted" className="text-sm font-normal text-muted-foreground">Show watchlisted</Label>
                    </div>
                </div>
            )}
          </div>

          <TabsContent value="reviews" className="mt-0">
             {contentLoading ? (
               <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
             ) : filteredContent.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-20">
                   {filteredContent.map((item) => (
                     <ReviewCard key={item.id} review={item} onLike={handleLike} hideUser />
                   ))}
                </div>
             ) : (
                content.length > 0 ? (
                  <EmptyState icon={Search} label="No results found" />
                ) : (
                  <EmptyState icon={Film} label="No reviews yet" />
                )
             )}
          </TabsContent>

          <TabsContent value="watchlist" className="mt-0">
             {contentLoading ? (
               <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
             ) : filteredContent.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-20">
                  {filteredContent.map((item) => (
                    <ReviewCard key={item.id} review={item} onLike={handleLike} hideUser />
                  ))}
                </div>
             ) : (
                content.length > 0 ? (
                  <EmptyState icon={Search} label="No results found" />
                ) : (
                  <EmptyState
                    icon={Bookmark}
                    label="Watchlist is empty"
                    description={isOwnProfile ? "Never forget a recommendation again. Add movies here to build your personal queue." : undefined}
                    action={isOwnProfile ? <Button onClick={() => navigate("/search")}>Search Films</Button> : undefined}
                  />
                )
             )}
          </TabsContent>

          <TabsContent value="foryou" className="mt-0">
             {contentLoading ? (
               <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
             ) : filteredRecommendations.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-20">
                  {filteredRecommendations.map((rec) => (
                    <RecommendationCard
                        key={rec.id}
                        recommendation={rec}
                        interaction={rec.interaction}
                        onDismiss={(id) => handleRecommendationAction(id, 'dismiss')}
                        onRate={handleRateFilm}
                        onWatchlist={handleWatchlistFilm}
                    />
                  ))}
                </div>
             ) : (
                <EmptyState icon={Star} label="No recommendations to display" description="Adjust filters or check back later." />
             )}
          </TabsContent>
        </Tabs>
      </div>

      {/* User List Modal */}
      <Dialog open={userListDialog.open} onOpenChange={(open) => setUserListDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize text-center">{userListDialog.type}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {userListLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : userList.length > 0 ? (
              <div className="space-y-1 p-1">
                {userList.map((u) => (
                  <div key={u.id} 
                       className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                       onClick={() => { setUserListDialog(prev => ({ ...prev, open: false })); navigate(`/profile/${u.username?.toLowerCase()}`); }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.username || "Unknown"}</span>
                    </div>
                    {/* Follow Toggle */}
                    {currentUser && currentUser.id !== u.id && (
                       <div onClick={(e) => e.stopPropagation()}>
                         <FollowButton
                           userId={u.id}
                           initialIsFollowing={u.is_following}
                           isFollower={u.is_follower}
                           className="h-8 text-xs px-3"
                         />
                       </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Manage Favorites (Films) Dialog */}
      <ManageFavoritesDialog
        open={showManageFavorites}
        onOpenChange={setShowManageFavorites}
        favorites={filmFavorites}
        onSave={handleSaveFavorites}
      />

      {/* Manage Highlights (Genres/People/Quotes) Dialog */}
      <ManageHighlightsDialog
        open={showManageHighlights}
        onOpenChange={setShowManageHighlights}
        favorites={favorites}
        onSave={handleSaveHighlights}
      />

      {/* Manage Tags Dialog */}
      {currentUser && (
        <ManageTagsDialog
          open={showManageTags}
          onOpenChange={setShowManageTags}
          userId={currentUser.id}
          onTagsUpdate={fetchTabContent}
        />
      )}
    </AppLayout>
  );
}

function EmptyState({ icon: Icon, label, description, action }: { icon: any, label: string, description?: string, action?: ReactNode }) {
  return (
    <div className="py-16 text-center border-2 border-dashed border-border/50 rounded-xl mt-4 px-4">
      <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground font-medium">{label}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
