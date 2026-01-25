import { useState, useEffect, useMemo, ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  Settings, LogOut, Building2, Bookmark, Loader2,
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
import { FollowButton } from "@/components/FollowButton";
import { useToast } from "@/hooks/use-toast";
import { FavoritesSection } from "@/components/profile/FavoritesSection";
import { ManageTagsDialog } from "@/components/profile/ManageTagsDialog";
import { FavoriteItem } from "@/components/profile/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MetaHead } from "@/components/common/MetaHead";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// New Components
import { UserCard } from "@/components/profile/UserCard";
import { ProfileHighlights } from "@/components/profile/ProfileHighlights";
import { CollectionsRow } from "@/components/profile/CollectionsRow";
import { SocialContextSection } from "@/components/profile/SocialContextSection";
import { FeedReview } from "@/types/feed";
import { useProfileComparison } from "@/hooks/useProfileComparison";

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
}

interface UserListItem {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_following: boolean;
  is_follower: boolean;
}

export default function Profile() {
  const { user: currentUser, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { username: routeUsername } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ reviews: 0, pending: 0, followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  // URL-derived state
  const activeTab = (searchParams.get("tab") as "reviews" | "bucket_list") || "reviews";
  const searchQuery = searchParams.get("search") || "";
  const selectedTag = searchParams.get("tag");

  const [loading, setLoading] = useState(true);
  
  const [content, setContent] = useState<FeedReview[]>([]);
  const [contentLoading, setContentLoading] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [showManageTags, setShowManageTags] = useState(false);

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
        item.building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = selectedTag === null || item.tags?.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [content, searchQuery, selectedTag]);

  const checkIfFollowing = async () => {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) return;
    const { data } = await supabase.from("follows").select("*").eq("follower_id", currentUser.id).eq("following_id", targetUserId).maybeSingle();
    setIsFollowing(!!data);
  };

  const fetchStats = async () => {
    if (!targetUserId) return;
    const [reviewsResult, pendingResult, followersResult, followingResult] = await Promise.all([
      supabase.from("user_buildings").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("status", "visited"),
      supabase.from("user_buildings").select("id", { count: "exact", head: true }).eq("user_id", targetUserId).eq("status", "pending"),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", targetUserId),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", targetUserId),
    ]);

    setStats({
      reviews: reviewsResult.count || 0,
      pending: pendingResult.count || 0,
      followers: followersResult.count || 0,
      following: followingResult.count || 0,
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

  const fetchTabContent = async () => {
    if (!targetUserId) return;
    setContentLoading(true);

    try {
        const status = activeTab === "reviews" ? "visited" : "pending";
        const { data: entriesData, error: entriesError } = await supabase
            .from("user_buildings")
            .select(`
            id, content, rating, created_at, edited_at, user_id, building_id, tags, status,
            building:buildings ( id, name, address, year_completed, architects )
            `)
            .eq("user_id", targetUserId)
            .eq("status", status)
            .order("edited_at", { ascending: false });

        if (entriesError) throw entriesError;

        if (!entriesData || entriesData.length === 0) {
            setContent([]);
            return;
        }

        const entryIds = entriesData.map((r) => r.id);

        // Fetch review images
        const { data: imagesData } = await supabase
          .from('review_images')
          .select('id, review_id, storage_path, likes_count')
          .in('review_id', entryIds);

        const imageIds = imagesData?.map(img => img.id) || [];

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
            const { data: { publicUrl } } = supabase.storage.from("review_images").getPublicUrl(img.storage_path);
            const imageObj = {
                id: img.id,
                url: publicUrl,
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
                architects: item.building?.architects || null,
            },
            tags: item.tags || [],
            likes_count: likesCount.get(item.id) || 0,
            comments_count: commentsCount.get(item.id) || 0,
            is_liked: userLikes.has(item.id),
            watch_with_users: [], // Removed watch_with for now
            images: imagesByReviewId.get(item.id) || [],
            };
        });

        setContent(formattedContent);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setContentLoading(false);
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

  // Filter only building favorites for the FavoritesSection
  const buildingFavorites = favorites.filter(f => !f.type || f.type === 'building');

  const avatarUrl = profile?.avatar_url
    ? (profile.avatar_url.startsWith("http")
        ? profile.avatar_url
        : supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl)
    : undefined;

  return (
    <AppLayout title={profile?.username || "Profile"} showLogo={false} showBack={!isOwnProfile}>
      <MetaHead
        title={`${profile?.username} (@${profile?.username})`}
        description={profile?.bio || `Check out ${profile?.username}'s reviews and watchlist on Archiforum.`}
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

      {/* Social Context Section */}
      {!isOwnProfile && (
        <SocialContextSection mutualAffinityUsers={profileComparison.mutualAffinityUsers} />
      )}

      {/* 2. Favorite Buildings (Moved to body as requested implicitly by "Add a section") */}
      {/* Only show if not empty (hidden for own profile) */}
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
              <TabsList className="grid w-full max-w-[200px] grid-cols-2">
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="bucket_list">Bucket List</TabsTrigger>
              </TabsList>
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
                onClick={() => navigate(`/search?rated_by=${profile?.username || ""}`)}
                title="Filter by rated buildings"
                >
                <Filter className="h-4 w-4" />
                </Button>
            </div>
          </div>

          <TabsContent value="reviews" className="mt-0">
             {contentLoading ? (
               <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
             ) : filteredContent.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-20">
                   {filteredContent.map((item) => (
                     <ReviewCard key={item.id} entry={item} onLike={handleLike} hideUser variant="compact" />
                   ))}
                </div>
             ) : (
                content.length > 0 ? (
                  <EmptyState icon={Search} label="No results found" />
                ) : (
                  <EmptyState icon={Building2} label="No visited buildings yet" />
                )
             )}
          </TabsContent>

          <TabsContent value="bucket_list" className="mt-0">
             {contentLoading ? (
               <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
             ) : filteredContent.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pb-20">
                  {filteredContent.map((item) => (
                    <ReviewCard key={item.id} entry={item} onLike={handleLike} hideUser variant="compact" />
                  ))}
                </div>
             ) : (
                content.length > 0 ? (
                  <EmptyState icon={Search} label="No results found" />
                ) : (
                  <EmptyState
                    icon={Bookmark}
                    label="Bucket List is empty"
                    description={isOwnProfile ? "Never forget a recommendation again. Add buildings here to build your personal queue." : undefined}
                    action={isOwnProfile ? <Button onClick={() => navigate("/search")}>Search Buildings</Button> : undefined}
                  />
                )
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
