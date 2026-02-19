import { useState, useEffect, useMemo, ReactNode, useCallback } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  Settings, LogOut, Building2, Bookmark, Loader2,
  MoreVertical, Heart, Filter, Star, ArrowRight,
  Search, X, Share2, Edit2, LayoutGrid, Columns
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
import { FollowButton } from "@/components/FollowButton";
import { useToast } from "@/hooks/use-toast";
import { FavoritesSection } from "@/components/profile/FavoritesSection";
import { FavoriteItem } from "@/components/profile/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MetaHead } from "@/components/common/MetaHead";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSidebar } from "@/components/ui/sidebar";

// New Components
import { UserCard } from "@/components/profile/UserCard";
import { ProfileHighlights } from "@/components/profile/ProfileHighlights";
import { SocialContextSection } from "@/components/profile/SocialContextSection";
import { CollectionsGrid } from "@/components/profile/CollectionsGrid";
import { FavoriteCollectionsGrid } from "@/components/profile/FavoriteCollectionsGrid";
import { CreateCollectionDialog } from "@/components/profile/CreateCollectionDialog";
import { FeedReview } from "@/types/feed";
import { useProfileComparison } from "@/hooks/useProfileComparison";
import { getBuildingImageUrl } from "@/utils/image";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { ProfileKanbanView } from "@/components/profile/ProfileKanbanView";

// --- Types ---
interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  last_online?: string | null;
  role?: string;
}

interface Stats {
  reviews: number;
  pending: number;
  followers: number;
  following: number;
  photos: number;
  maps: number;
}

interface UserListItem {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_following: boolean;
  is_follower: boolean;
}

const ITEMS_PER_PAGE = 15;

export default function Profile() {
  const { user: currentUser, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { state, isMobile } = useSidebar();
  
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ reviews: 0, pending: 0, followers: 0, following: 0, photos: 0, maps: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  // URL-derived state
  const tabParam = searchParams.get("tab");
  const activeFilter = tabParam === 'reviews' ? 'visited' : (tabParam === 'bucket_list' ? 'pending' : 'all');

  const searchQuery = searchParams.get("search") || "";

  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [content, setContent] = useState<FeedReview[]>([]);
  const [contentLoading, setContentLoading] = useState(false); // Initial load
  const [isFetchingMore, setIsFetchingMore] = useState(false); // Subsequent pages
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { containerRef, isVisible } = useIntersectionObserver();

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showCommunityImages, setShowCommunityImages] = useState(false);

  // Drag State
  const [activeId, setActiveId] = useState<string | null>(null);

  // Collections State
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [collectionsRefreshKey, setCollectionsRefreshKey] = useState(0);

  // Drag and Drop Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) return;
    if (active.id === over.id) return;

    // Find the active item
    const activeItem = content.find(item => item.id === active.id);
    if (!activeItem) return;

    // Determine new rating
    let newRating: number | null = null;

    // Check if over is a column
    if (over.id === 'saved') newRating = 0;
    else if (over.id === '1-point') newRating = 1;
    else if (over.id === '2-points') newRating = 2;
    else if (over.id === '3-points') newRating = 3;
    else {
      // Over might be another card
      const overItem = content.find(item => item.id === over.id);
      if (overItem) {
        newRating = overItem.rating;
        // If dropped on a saved item (rating null), treat as 0 for consistency
        if (newRating === null) newRating = 0;
      } else {
        // Unknown drop target
        return;
      }
    }

    // Normalize current rating for comparison (treat null as 0)
    const currentRating = activeItem.rating === null ? 0 : activeItem.rating;

    if (currentRating === newRating) return;

    // Proceed with update
    const previousContent = [...content];

    // Optimistic Update
    const optimisticRating = (newRating === 0) ? null : newRating;

    setContent(prev => prev.map(item =>
      item.id === activeItem.id
        ? { ...item, rating: optimisticRating, edited_at: new Date().toISOString() }
        : item
    ));

    try {
      // Supabase Update
      const dbRating = (newRating === 0 || newRating === null) ? null : newRating;

      const { error } = await supabase
        .from("user_buildings")
        .update({ rating: dbRating, edited_at: new Date().toISOString() })
        .eq("id", activeItem.id);

      if (error) throw error;

      toast({
        description: "Review updated",
        duration: 2000,
      });

    } catch (error) {
      console.error("Failed to update rating:", error);
      // Revert
      setContent(previousContent);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Could not move the card. Please try again.",
      });
    }
  };

  // New Profile Features
  const [squad, setSquad] = useState<Profile[]>([]);

  const { profileComparison } = useProfileComparison(currentUser?.id, targetUserId);

  const [userListDialog, setUserListDialog] = useState<{ open: boolean; type: "followers" | "following" }>({
    open: false,
    type: "followers"
  });
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);

  const isOwnProfile = currentUser?.id === targetUserId;

  // --- Handlers for URL State ---

  const handleFilterChange = (value: string) => {
    if (!value) return; // Prevent unselecting

    const newParams = new URLSearchParams(searchParams);

    if (value === 'visited') {
        newParams.set("tab", "reviews");
    } else if (value === 'pending') {
        newParams.set("tab", "bucket_list");
    } else {
        newParams.delete("tab"); // Default to all
    }

    // Maintain search and collection
    setSearchParams(newParams, { replace: true, preventScrollReset: true });

    requestAnimationFrame(() => {
      const contentSection = document.getElementById('profile-content-start');
      if (contentSection) {
        const rect = contentSection.getBoundingClientRect();
        if (rect.top < 64) {
          contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    }
  }, [targetUserId, collectionsRefreshKey]);

  useEffect(() => {
    if (targetUserId) {
      checkIfFollowing();
      fetchSquad();
    }
  }, [targetUserId, currentUser]);

  // --- Logic ---

  const fetchUserContent = useCallback(async (pageIndex: number, reset: boolean = false) => {
    if (!targetUserId) return;

    if (pageIndex === 0) {
        setContentLoading(true);
    } else {
        setIsFetchingMore(true);
    }

    try {
        let query = supabase
            .from("user_buildings")
            .select(`
            id, content, rating, created_at, edited_at, user_id, building_id, status,
            building:buildings ( id, name, address, year_completed, main_image_url, slug, short_id, architects:building_architects(architect:architects(name, id)) )
            `)
            .eq("user_id", targetUserId)
            .order("edited_at", { ascending: false });

        // Apply status filter in the query
        if (activeFilter === 'visited') {
            query = query.eq('status', 'visited');
        } else if (activeFilter === 'pending') {
            query = query.eq('status', 'pending');
        } else {
            query = query.in('status', ['visited', 'pending']);
        }

        // Pagination
        const from = pageIndex * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data: entriesData, error: entriesError } = await query;

        if (entriesError) throw entriesError;

        if (!entriesData || entriesData.length === 0) {
            if (reset) {
                setContent([]);
                setHasMore(false);
            } else {
                setHasMore(false);
            }
            return;
        }

        const entryIds = entriesData.map((r) => r.id);

        // Fetch review images ONLY for the current page IDs
        const { data: imagesData } = await supabase
          .from('review_images')
          .select('id, review_id, storage_path, likes_count')
          .in('review_id', entryIds);

        const imageIds = imagesData?.map(img => img.id) || [];

        // Fetch interactions ONLY for the current page IDs
        const [likesResult, commentsResult, userLikesResult, imageLikesResult] = await Promise.all([
            supabase.from("likes").select("interaction_id").in("interaction_id", entryIds),
            supabase.from("comments").select("interaction_id").in("interaction_id", entryIds),
            currentUser ? supabase.from("likes").select("interaction_id").in("interaction_id", entryIds).eq("user_id", currentUser.id) : Promise.resolve({ data: [] }),
            currentUser && imageIds.length > 0 ? supabase.from("image_likes").select("image_id").in("image_id", imageIds).eq("user_id", currentUser.id) : Promise.resolve({ data: [] }),
        ]);

        const likesCount = new Map();
        likesResult.data?.forEach(l => likesCount.set(l.interaction_id, (likesCount.get(l.interaction_id) || 0) + 1));

        const commentsCount = new Map();
        commentsResult.data?.forEach(c => commentsCount.set(c.interaction_id, (commentsCount.get(c.interaction_id) || 0) + 1));

        const userLikes = new Set(userLikesResult.data?.map(l => l.interaction_id));
        const userLikedImages = new Set(imageLikesResult.data?.map((l: any) => l.image_id));

        // Group images by review_id
        const imagesByReviewId = new Map();
        imagesData?.forEach(img => {
            const imageObj = {
                id: img.id,
                url: getBuildingImageUrl(img.storage_path),
                likes_count: img.likes_count || 0,
                is_liked: userLikedImages.has(img.id)
            };
            if (!imagesByReviewId.has(img.review_id)) {
                imagesByReviewId.set(img.review_id, []);
            }
            imagesByReviewId.get(img.review_id).push(imageObj);
        });

        const formattedContent: FeedReview[] = entriesData.map((item: any) => {
            return {
            id: item.id,
            content: item.content,
            rating: item.rating,
            created_at: item.created_at,
            edited_at: item.edited_at,
            status: item.status,
            user: { username: profile?.username || "Unknown", avatar_url: profile?.avatar_url || null },
            building: {
                id: item.building?.id || item.building_id,
                name: item.building?.name || "Unknown Building",
                address: item.building?.address || null,
                year_completed: item.building?.year_completed || null,
                main_image_url: item.building?.main_image_url || null,
                slug: item.building?.slug || null,
                short_id: item.building?.short_id || null,
                architects: item.building?.architects?.map((a: any) => a.architect).filter(Boolean) || [],
            },
            tags: [],
            likes_count: likesCount.get(item.id) || 0,
            comments_count: commentsCount.get(item.id) || 0,
            is_liked: userLikes.has(item.id),
            watch_with_users: [],
            images: imagesByReviewId.get(item.id) || [],
            };
        });

        if (reset) {
            setContent(formattedContent);
            setHasMore(formattedContent.length === ITEMS_PER_PAGE);
            setPage(0);
        } else {
            setContent(prev => [...prev, ...formattedContent]);
            setHasMore(formattedContent.length === ITEMS_PER_PAGE);
        }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setContentLoading(false);
      setIsFetchingMore(false);
    }
  }, [targetUserId, activeFilter, currentUser, profile]);

  // Initial Fetch Effect
  useEffect(() => {
    if (targetUserId) {
        fetchUserContent(0, true);
    }
  }, [fetchUserContent]);

  // Infinite Scroll Effect
  useEffect(() => {
    if (isVisible && hasMore && !isFetchingMore && !contentLoading) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchUserContent(nextPage, false);
    }
  }, [isVisible, hasMore, isFetchingMore, contentLoading, page, fetchUserContent]);


  // Computed: Filtered Content (Only Client-Side Search)
  const filteredContent = useMemo(() => {
    return content.filter(item => {
      // Status filtering is now handled by the API
      const matchesSearch = searchQuery === "" ||
        item.building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [content, searchQuery]);

  // Computed: Partitioned Content for Kanban
  const kanbanData = useMemo(() => {
    return {
      saved: filteredContent.filter(item => item.rating === null || item.rating === 0),
      onePoint: filteredContent.filter(item => item.rating === 1),
      twoPoints: filteredContent.filter(item => item.rating === 2),
      threePoints: filteredContent.filter(item => item.rating === 3),
    };
  }, [filteredContent]);

  const checkIfFollowing = async () => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) return;
    const { data } = await supabase.from("follows").select("*").eq("follower_id", currentUser.id).eq("following_id", targetUserId).maybeSingle();
    setIsFollowing(!!data);
  };

  const fetchStats = async () => {
    if (!targetUserId) return;

    const [reviewsResult, pendingResult, followersResult, followingResult, photosResult, collectionsResult] = await Promise.all([
      supabase.from("user_buildings").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("status", "visited"),
      supabase.from("user_buildings").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("status", "pending"),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", targetUserId),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", targetUserId),
      supabase.from("review_images").select("id", { count: "exact", head: true }).eq("user_id", targetUserId),
      supabase.from("collections").select("id", { count: "exact", head: true }).eq("owner_id", targetUserId)
    ]);

    setStats({
      reviews: reviewsResult.count || 0,
      pending: pendingResult.count || 0,
      followers: followersResult.count || 0,
      following: followingResult.count || 0,
      photos: photosResult.count || 0,
      maps: collectionsResult.count || 0,
    });
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
        <div
          className={cn(
            "transition-[margin-left] duration-200 ease-linear w-auto",
            state === "collapsed" ? "md:ml-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]" : "md:ml-0"
          )}
        >
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
        </div>
      )
  }

  // Filter only building favorites for the FavoritesSection
  const buildingFavorites = favorites.filter(f => !f.type || f.type === 'building');

  const avatarUrl = profile?.avatar_url
    ? (profile.avatar_url.startsWith("http")
        ? profile.avatar_url
        : supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl)
    : undefined;

  return (
    <div
      className={cn(
        "transition-[margin-left] duration-200 ease-linear w-auto",
        "md:ml-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]"
      )}
    >
      <AppLayout title="Profile" showLogo={false} showBack={!isOwnProfile}>
        <MetaHead
          title={`${profile?.username} (@${profile?.username})`}
          description={profile?.bio || `Check out ${profile?.username}'s reviews and watchlist on Plano.`}
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
          // Map tab values to filters for UserCard stats
          onTabChange={handleFilterChange}
          squad={squad}
        />

        {/* Social Context Section */}
        {!isOwnProfile && (
          <SocialContextSection
            mutualAffinityUsers={profileComparison.mutualAffinityUsers}
            commonFollowers={profileComparison.commonFollowers}
          />
        )}

        {/* 2. Favorite Buildings */}
        {!isOwnProfile && buildingFavorites.length > 0 && (
          <FavoritesSection
              favorites={buildingFavorites}
              isOwnProfile={false}
              onManage={() => {}}
          />
        )}

        {/* 3. Highlights (Genres, People, Quotes) */}
        {!isOwnProfile && (
          <ProfileHighlights
            favorites={favorites}
            isOwnProfile={false}
            onManage={() => {}}
          />
        )}

        {/* 4. Collections Grid */}
        {targetUserId && (
            <div id="collections-section" className="scroll-mt-24">
                <CollectionsGrid
                  userId={targetUserId}
                  username={profile?.username || null}
                  isOwnProfile={isOwnProfile}
                  onCreate={isOwnProfile ? () => setShowCreateCollection(true) : undefined}
                  refreshKey={collectionsRefreshKey}
                />
                <FavoriteCollectionsGrid userId={targetUserId} />
            </div>
        )}

        {/* 5. Filter & Content Section */}
        <div className="px-4 mt-2 scroll-mt-20 min-h-screen" id="profile-content-start">
            <div className="sticky top-14 md:top-0 bg-background z-10 pt-2 pb-4 space-y-3 shadow-sm border-b border-border/40 -mx-4 px-4 mb-4">
              <div className="flex items-center justify-between">

                <div className="flex items-center gap-4">
                  {/* Filter Toggle */}
                  <ToggleGroup type="single" value={activeFilter} onValueChange={handleFilterChange} className="justify-start">
                      <ToggleGroupItem value="all" className="px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                          All
                      </ToggleGroupItem>
                      <ToggleGroupItem value="visited" className="px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                          Reviews
                      </ToggleGroupItem>
                      <ToggleGroupItem value="pending" className="px-3 py-1.5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                          Bucket List
                      </ToggleGroupItem>
                  </ToggleGroup>

                  {/* View Toggle */}
                  <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'kanban')}>
                    <ToggleGroupItem value="grid" size="sm" aria-label="Grid View">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="kanban" size="sm" aria-label="Kanban View">
                      <Columns className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="show-community"
                    checked={showCommunityImages}
                    onCheckedChange={setShowCommunityImages}
                  />
                  <Label htmlFor="show-community" className="text-xs text-muted-foreground hidden sm:block">
                    Community Photos
                  </Label>
                </div>
              </div>

              {/* Search Input */}
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
                  onClick={() => navigate(`/search?rated_by=${profile?.username || ""}&open_filters=true`)}
                  title="Filter by rated buildings"
                  >
                  <Filter className="h-4 w-4" />
                  </Button>
              </div>
            </div>

            {/* Grid Content */}
            <div className="mt-0">
              {contentLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filteredContent.length > 0 ? (
                  <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-20">
                      {filteredContent.map((item) => (
                        <ReviewCard
                          key={item.id}
                          entry={item}
                          onLike={handleLike}
                          hideUser
                          variant="compact"
                          showCommunityImages={showCommunityImages}
                        />
                      ))}
                    </div>
                  ) : (
                    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                      <ProfileKanbanView kanbanData={kanbanData} />
                      <DragOverlay dropAnimation={null}>
                        {activeId ? (
                          <div className="w-[280px] scale-105 shadow-xl z-50 cursor-grabbing rounded-xl bg-card border overflow-hidden opacity-90">
                            {(() => {
                              const activeItem = content.find((i) => i.id === activeId);
                              return activeItem ? (
                                <ReviewCard
                                  entry={activeItem}
                                  variant="compact"
                                  hideUser
                                  imagePosition="left"
                                />
                              ) : null;
                            })()}
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )}
                  <div ref={containerRef} className="h-4 w-full" />
                  </>
              ) : (
                  // Empty States
                  (searchQuery) ? (
                    <EmptyState icon={Search} label="No results found" />
                  ) : activeFilter === 'visited' ? (
                    <EmptyState icon={Building2} label="No visited buildings yet" />
                  ) : activeFilter === 'pending' ? (
                    <EmptyState
                        icon={Bookmark}
                        label="Bucket List is empty"
                        description={isOwnProfile ? "Never forget a recommendation again. Add buildings here to build your personal queue." : undefined}
                        action={isOwnProfile ? <Button onClick={() => navigate("/search")}>Search Buildings</Button> : undefined}
                    />
                  ) : (
                    <EmptyState icon={Building2} label="No activity yet" />
                  )
              )}
              {isFetchingMore && (
                  <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
              )}
            </div>
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

        {/* Create Collection Dialog */}
        {currentUser && (
          <CreateCollectionDialog
            open={showCreateCollection}
            onOpenChange={setShowCreateCollection}
            userId={currentUser.id}
            onSuccess={() => {
              setCollectionsRefreshKey(prev => prev + 1);
              setShowCreateCollection(false);
            }}
          />
        )}
      </AppLayout>
    </div>
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
