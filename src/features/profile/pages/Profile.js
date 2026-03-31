import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { LogOut, Building2, Bookmark, Loader2, Map as MapIcon, Search, X, LayoutGrid, Columns, List, SlidersHorizontal, } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { ReviewCard } from "@/features/feed/components/ReviewCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FollowButton } from "@/features/profile/components/FollowButton";
import { useToast } from "@/hooks/use-toast";
import { FavoritesSection } from "@/features/profile/components/FavoritesSection";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MetaHead } from "@/components/common/MetaHead";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// New Components
import { UserCard } from "@/features/profile/components/UserCard";
import { ProfileHighlights } from "@/features/profile/components/ProfileHighlights";
import { SocialContextSection } from "@/features/profile/components/SocialContextSection";
import { CollectionsGrid } from "@/features/collections/components/CollectionsGrid";
import { CreateCollectionDialog } from "@/features/collections/components/CreateCollectionDialog";
import { useProfileComparison } from "@/features/profile/hooks/useProfileComparison";
import { getBuildingImageUrl } from "@/utils/image";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { ProfileKanbanView } from "@/features/profile/components/ProfileKanbanView";
import { handleDragEndLogic } from "@/utils/kanbanLogic";
import { ProfileListView } from "@/features/profile/components/ProfileListView";
import { ArchitectPortfolio } from "@/features/architect/components/ArchitectPortfolio";
const variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } }
};
const ITEMS_PER_PAGE = 15;
export default function Profile() {
    const { user: currentUser, loading: authLoading, signOut } = useAuth();
    const navigate = useNavigate();
    const { username: routeUsername } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState('grid');
    const [targetUserId, setTargetUserId] = useState(null);
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState({ reviews: 0, pending: 0, followers: 0, following: 0, photos: 0, maps: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    // URL-derived state
    const tabParam = searchParams.get("tab");
    const activeFilter = tabParam === 'reviews' ? 'visited' : (tabParam === 'bucket_list' ? 'pending' : 'all');
    const searchQuery = searchParams.get("search") || "";
    const [loading, setLoading] = useState(true);
    // Pagination State
    const [content, setContent] = useState([]);
    const [contentLoading, setContentLoading] = useState(false); // Initial load
    const [isFetchingMore, setIsFetchingMore] = useState(false); // Subsequent pages
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const { containerRef, isVisible } = useIntersectionObserver();
    // Favorites
    const [favorites, setFavorites] = useState([]);
    const [showCommunityImages, setShowCommunityImages] = useState(false);
    // Drag State
    const [activeId, setActiveId] = useState(null);
    const [updatingItemId, setUpdatingItemId] = useState(null);
    // Collections State
    const [showCreateCollection, setShowCreateCollection] = useState(false);
    const [collectionsRefreshKey, setCollectionsRefreshKey] = useState(0);
    // Collections Drag State
    const [activeCollectionData, setActiveCollectionData] = useState(null);
    // Drag and Drop Sensors
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 10 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);
        await handleDragEndLogic({
            activeId: active.id,
            overId: over?.id || null,
            content,
            setContent,
            supabase,
            toast,
            setUpdatingItemId
        });
    };
    const handleCollectionDragStart = (event) => {
        const { active } = event;
        if (active.data.current?.type === "collection") {
            setActiveCollectionData(active.data.current.collection);
        }
    };
    const handleCollectionDragEnd = async (event) => {
        const { active, over } = event;
        setActiveCollectionData(null);
        if (!over || active.data.current?.type !== "collection" || over.data.current?.type !== "folder") {
            return;
        }
        const collectionId = active.id.toString().replace("collection-", "");
        const folderId = over.id.toString().replace("folder-", "");
        try {
            // Check if already in folder
            const { data: existing } = await supabase
                .from("user_folder_items")
                .select("folder_id")
                .eq("folder_id", folderId)
                .eq("collection_id", collectionId)
                .maybeSingle();
            if (!existing) {
                const { error } = await supabase
                    .from("user_folder_items")
                    .insert({ folder_id: folderId, collection_id: collectionId });
                if (error)
                    throw error;
                toast({ description: "Added to folder" });
                setCollectionsRefreshKey(prev => prev + 1);
            }
            else {
                toast({ description: "Already in folder" });
            }
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to add to folder" });
        }
    };
    // New Profile Features
    const [squad, setSquad] = useState([]);
    const { profileComparison } = useProfileComparison(currentUser?.id, targetUserId);
    const [userListDialog, setUserListDialog] = useState({
        open: false,
        type: "followers"
    });
    const [userList, setUserList] = useState([]);
    const [userListLoading, setUserListLoading] = useState(false);
    const isOwnProfile = currentUser?.id === targetUserId;
    const { profile: currentUserProfile } = useUserProfile();
    const verifiedArchitectId = isOwnProfile ? currentUserProfile?.verified_architect_id : profile?.verified_architect_id;
    // --- Handlers for URL State ---
    const handleFilterChange = (value) => {
        if (!value)
            return; // Prevent unselecting
        const newParams = new URLSearchParams(searchParams);
        if (value === 'visited') {
            newParams.set("tab", "reviews");
        }
        else if (value === 'pending') {
            newParams.set("tab", "bucket_list");
        }
        else {
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
    const handleSearchChange = (query) => {
        const newParams = new URLSearchParams(searchParams);
        if (query) {
            newParams.set("search", query);
        }
        else {
            newParams.delete("search");
        }
        setSearchParams(newParams, { replace: true, preventScrollReset: true });
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
            let uid = null;
            let query = supabase.from("profiles").select("id, username, avatar_url, bio, favorites, last_online, verified_architect_id");
            let data = null;
            if (routeUsername) {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeUsername);
                if (isUuid) {
                    query = query.eq("id", routeUsername);
                }
                else {
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
            }
            else if (currentUser) {
                uid = currentUser.id;
                const res = await supabase
                    .from("profiles")
                    .select("id, username, avatar_url, bio, favorites, last_online, verified_architect_id")
                    .eq("id", uid)
                    .maybeSingle();
                data = res.data;
            }
            if (data) {
                setProfile(data);
                uid = data.id;
                const favs = Array.isArray(data.favorites) ? data.favorites : [];
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
    const fetchUserContent = useCallback(async (pageIndex, reset = false) => {
        if (!targetUserId)
            return;
        if (pageIndex === 0) {
            setContentLoading(true);
        }
        else {
            setIsFetchingMore(true);
        }
        try {
            let query = supabase
                .from("user_buildings")
                .select(`
            id, content, rating, created_at, edited_at, user_id, building_id, status,
            building:buildings ( id, name, address, city, country, year_completed, main_image_url, slug, short_id, architects:building_architects(architect:architects(name, id)) )
            `)
                .eq("user_id", targetUserId)
                .order("edited_at", { ascending: false, nullsFirst: false })
                .order("created_at", { ascending: false });
            // Apply status filter in the query
            if (activeFilter === 'visited') {
                query = query.eq('status', 'visited');
            }
            else if (activeFilter === 'pending') {
                query = query.eq('status', 'pending');
            }
            else {
                query = query.in('status', ['visited', 'pending']);
            }
            // Pagination
            const from = pageIndex * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            query = query.range(from, to);
            const { data: entriesData, error: entriesError } = await query;
            if (entriesError)
                throw entriesError;
            if (!entriesData || entriesData.length === 0) {
                if (reset) {
                    setContent([]);
                    setHasMore(false);
                }
                else {
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
            const userLikedImages = new Set(imageLikesResult.data?.map((l) => l.image_id));
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
            const formattedContent = entriesData.map((item) => {
                const reviewLikes = likesCount.get(item.id) || 0;
                const itemImages = imagesByReviewId.get(item.id) || [];
                const imageLikes = itemImages.reduce((sum, img) => sum + (img.likes_count || 0), 0);
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
                        city: item.building?.city || null,
                        country: item.building?.country || null,
                        year_completed: item.building?.year_completed || null,
                        main_image_url: item.building?.main_image_url || null,
                        slug: item.building?.slug || null,
                        short_id: item.building?.short_id || null,
                        architects: item.building?.architects?.flatMap((a) => (a.architect ? [a.architect] : [])) || [],
                    },
                    tags: [],
                    likes_count: reviewLikes + imageLikes,
                    comments_count: commentsCount.get(item.id) || 0,
                    is_liked: userLikes.has(item.id),
                    watch_with_users: [],
                    images: itemImages,
                };
            });
            if (reset) {
                setContent(formattedContent);
                setHasMore(formattedContent.length === ITEMS_PER_PAGE);
                setPage(0);
            }
            else {
                setContent(prev => [...prev, ...formattedContent]);
                setHasMore(formattedContent.length === ITEMS_PER_PAGE);
            }
        }
        catch (_error) {
        }
        finally {
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
        const sortByDate = (a, b) => {
            const dateA = new Date(a.edited_at || a.created_at).getTime();
            const dateB = new Date(b.edited_at || b.created_at).getTime();
            return dateB - dateA;
        };
        return {
            saved: filteredContent.filter(item => item.rating === null || item.rating === 0).sort(sortByDate),
            onePoint: filteredContent.filter(item => item.rating === 1).sort(sortByDate),
            twoPoints: filteredContent.filter(item => item.rating === 2).sort(sortByDate),
            threePoints: filteredContent.filter(item => item.rating === 3).sort(sortByDate),
        };
    }, [filteredContent]);
    const checkIfFollowing = async () => {
        if (!currentUser || !targetUserId || currentUser.id === targetUserId)
            return;
        const { data } = await supabase.from("follows").select("*").eq("follower_id", currentUser.id).eq("following_id", targetUserId).maybeSingle();
        setIsFollowing(!!data);
    };
    const fetchStats = async () => {
        if (!targetUserId)
            return;
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
        if (!targetUserId || !isOwnProfile)
            return;
        const { data } = await supabase
            .from("follows")
            .select("following:profiles!follows_following_id_fkey(id, username, avatar_url)")
            .eq("follower_id", targetUserId)
            .limit(5);
        if (data) {
            const squadMembers = data
                .map((row) => {
                const f = row.following;
                return Array.isArray(f) ? f[0] : f;
            })
                .filter((p) => p != null);
            setSquad(squadMembers);
        }
    };
    const handleBuildingAdded = () => {
        fetchUserContent(0, true);
        fetchStats();
    };
    const handleLike = async (reviewId) => {
        if (!currentUser)
            return;
        const item = content.find((r) => r.id === reviewId);
        if (!item)
            return;
        setContent((prev) => prev.map((r) => r.id === reviewId
            ? { ...r, is_liked: !r.is_liked, likes_count: r.is_liked ? r.likes_count - 1 : r.likes_count + 1 }
            : r));
        try {
            if (item.is_liked) {
                await supabase.from("likes").delete().eq("interaction_id", reviewId).eq("user_id", currentUser.id);
            }
            else {
                await supabase.from("likes").insert({ interaction_id: reviewId, user_id: currentUser.id });
            }
        }
        catch (_error) {
            void _error;
        }
    };
    const handleFollowToggle = async () => {
        if (!currentUser || !targetUserId)
            return;
        if (isFollowing) {
            await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", targetUserId);
            setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
        }
        else {
            await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: targetUserId });
            setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        }
        setIsFollowing(!isFollowing);
    };
    const handleUpdate = async (id, updates) => {
        if (!currentUser || !isOwnProfile)
            return;
        const previousContent = [...content];
        const itemIndex = content.findIndex(i => i.id === id);
        if (itemIndex === -1)
            return;
        const currentItem = content[itemIndex];
        // Calculate new item state
        const newItem = { ...currentItem, ...updates, edited_at: new Date().toISOString() };
        // Optimistic Update Content
        setContent(prev => prev.map(item => item.id === id ? newItem : item));
        // Optimistic Stats Update (if status changed)
        if (updates.status && updates.status !== currentItem.status) {
            setStats(prev => {
                const newStats = { ...prev };
                // If current was 'pending', we decrement pending.
                // If current was NOT 'pending', we decrement 'reviews'.
                if (currentItem.status === 'pending') {
                    newStats.pending = Math.max(0, newStats.pending - 1);
                }
                else {
                    newStats.reviews = Math.max(0, newStats.reviews - 1);
                }
                // If new is 'pending', increment pending.
                // If new is NOT 'pending' (i.e. 'visited'), increment reviews.
                if (updates.status === 'pending') {
                    newStats.pending++;
                }
                else {
                    newStats.reviews++;
                }
                return newStats;
            });
        }
        try {
            const { error } = await supabase
                .from('user_buildings')
                .update({ ...updates, edited_at: new Date().toISOString() })
                .eq('id', id);
            if (error)
                throw error;
            if (updates.status) {
                toast({ description: "Status updated" });
            }
        }
        catch (_error) {
            // Revert content
            setContent(previousContent);
            // Revert stats if needed
            if (updates.status && updates.status !== currentItem.status) {
                setStats(prev => {
                    const newStats = { ...prev };
                    // Simply reverse the operations
                    if (updates.status === 'pending') {
                        newStats.pending--;
                    }
                    else {
                        newStats.reviews--;
                    }
                    if (currentItem.status === 'pending') {
                        newStats.pending++;
                    }
                    else {
                        newStats.reviews++;
                    }
                    return newStats;
                });
            }
            toast({ variant: "destructive", description: "Failed to update" });
        }
    };
    // --- Favorites Handlers ---
    const handleSignOut = async () => {
        await signOut();
        navigate("/");
    };
    const openUserList = async (type) => {
        setUserListDialog({ open: true, type });
        setUserListLoading(true);
        setUserList([]);
        if (!targetUserId)
            return;
        try {
            let ids = [];
            if (type === "followers") {
                const { data } = await supabase.from("follows").select("follower_id").eq("following_id", targetUserId);
                ids = data?.map(f => f.follower_id) || [];
            }
            else {
                const { data } = await supabase.from("follows").select("following_id").eq("follower_id", targetUserId);
                ids = data?.map(f => f.following_id) || [];
            }
            if (ids.length > 0) {
                const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
                let formattedUsers = [];
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
                        if (a.is_following && !b.is_following)
                            return -1;
                        if (!a.is_following && b.is_following)
                            return 1;
                        if (a.is_follower && !b.is_follower)
                            return -1;
                        if (!a.is_follower && b.is_follower)
                            return 1;
                        return (a.username || "").localeCompare(b.username || "");
                    });
                }
                else {
                    formattedUsers = profiles?.map(p => ({ ...p, is_following: false, is_follower: false })) || [];
                }
                setUserList(formattedUsers);
            }
        }
        catch (_error) {
            void _error;
        }
        finally {
            setUserListLoading(false);
        }
    };
    // --- Render Helpers ---
    if (authLoading || loading) {
        return (_jsx("div", { className: "min-h-screen bg-surface-default flex items-center justify-center", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-brand-primary" }) }));
    }
    if (!profile && !loading) {
        return (_jsx(_Fragment, { children: _jsx(AppLayout, { title: "User Not Found", showLogo: false, showBack: true, children: _jsxs("div", { className: "flex flex-col items-center justify-center min-h-[60vh] px-4 text-center", children: [_jsx("div", { className: "bg-surface-muted/50 p-6 rounded-full mb-6", children: _jsx(LogOut, { className: "h-10 w-10 text-text-secondary" }) }), _jsx("h2", { className: "text-2xl font-bold mb-2", children: "User Unavailable" }), _jsx("p", { className: "text-text-secondary max-w-sm mx-auto mb-8", children: "This profile is not available. The user might have been deleted, suspended, or does not exist." }), _jsx(Button, { onClick: () => navigate("/"), children: "Go Home" })] }) }) }));
    }
    // Filter only building favorites for the FavoritesSection
    const buildingFavorites = favorites.filter(f => !f.type || f.type === 'building');
    const avatarUrl = profile?.avatar_url
        ? (profile.avatar_url.startsWith("http")
            ? profile.avatar_url
            : supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl)
        : undefined;
    return (_jsx(_Fragment, { children: _jsxs(AppLayout, { title: "Profile", showLogo: false, showBack: !isOwnProfile, fullWidth: true, children: [_jsx(MetaHead, { title: `${profile?.username} (@${profile?.username})`, description: profile?.bio || `Check out ${profile?.username}'s reviews and watchlist on Plano.`, image: avatarUrl }), _jsxs("div", { className: "p-4 sm:p-6 lg:p-8", children: [_jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx(UserCard, { profile: profile, stats: stats, isOwnProfile: isOwnProfile, isFollowing: isFollowing, onFollowToggle: handleFollowToggle, onSignOut: handleSignOut, onOpenUserList: openUserList, 
                                    // Map tab values to filters for UserCard stats
                                    onTabChange: handleFilterChange, onBuildingAdded: handleBuildingAdded, squad: squad }), !isOwnProfile && (_jsx("div", { className: "mt-8", children: _jsx(SocialContextSection, { mutualAffinityUsers: profileComparison.mutualAffinityUsers, commonFollowers: profileComparison.commonFollowers }) })), verifiedArchitectId && (_jsx("div", { className: "mt-12 pt-8 border-t border-border-default mb-8", children: _jsx(WidgetErrorBoundary, { children: _jsx(ArchitectPortfolio, { architectId: verifiedArchitectId, isOwnProfile: isOwnProfile }) }) })), !isOwnProfile && buildingFavorites.length > 0 && (_jsx("div", { className: "mt-8", children: _jsx(FavoritesSection, { favorites: buildingFavorites, isOwnProfile: false, onManage: () => { } }) })), !isOwnProfile && (_jsx("div", { className: "mt-8", children: _jsx(ProfileHighlights, { favorites: favorites, isOwnProfile: false, onManage: () => { } }) })), targetUserId && (_jsx("div", { id: "collections-section", className: "mt-12", children: _jsx(WidgetErrorBoundary, { children: _jsxs(DndContext, { sensors: sensors, onDragStart: handleCollectionDragStart, onDragEnd: handleCollectionDragEnd, children: [_jsx(CollectionsGrid, { userId: targetUserId, username: profile?.username || null, isOwnProfile: isOwnProfile, onCreate: isOwnProfile ? () => setShowCreateCollection(true) : undefined, refreshKey: collectionsRefreshKey }), _jsx(DragOverlay, { dropAnimation: null, children: activeCollectionData ? (_jsx("div", { className: "scale-105 shadow-xl cursor-grabbing rounded-sm bg-surface-card border border-border-default overflow-hidden opacity-90 inline-block", children: _jsx("div", { className: "p-4 h-[100px] w-[180px] flex flex-col justify-between", children: _jsx("h4", { className: "font-medium text-sm line-clamp-2 leading-tight text-text-primary", children: activeCollectionData.name }) }) })) : null })] }) }) })), _jsxs("div", { className: "mt-12 border-t border-border-default pt-8 scroll-mt-20 min-h-screen", id: "profile-content-start", children: [_jsxs("div", { className: "sticky top-16 md:top-0 bg-surface-default z-30 pt-2 pb-4 border-b border-border-default -mx-4 px-4 mb-4 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 md:gap-4 overflow-x-auto max-w-full pb-1 -mb-1 hide-scrollbar", children: [_jsxs(ToggleGroup, { type: "single", value: activeFilter, onValueChange: handleFilterChange, className: "justify-start", children: [_jsx(ToggleGroupItem, { value: "all", className: "px-3 py-1.5 text-sm data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground", children: "All" }), _jsx(ToggleGroupItem, { value: "visited", className: "px-3 py-1.5 text-sm data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground", children: "Reviews" }), _jsx(ToggleGroupItem, { value: "pending", className: "px-3 py-1.5 text-sm data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground", children: "Bucket List" })] }), _jsxs(ToggleGroup, { type: "single", value: viewMode, onValueChange: (v) => v && setViewMode(v), className: "ml-2", children: [_jsx(ToggleGroupItem, { value: "grid", size: "sm", "aria-label": "Grid View", children: _jsx(LayoutGrid, { className: "h-4 w-4" }) }), _jsx(ToggleGroupItem, { value: "kanban", size: "sm", "aria-label": "Kanban View", children: _jsx(Columns, { className: "h-4 w-4" }) }), _jsx(ToggleGroupItem, { value: "list", size: "sm", "aria-label": "List View", children: _jsx(List, { className: "h-4 w-4" }) })] })] }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "sm", className: "inline-flex items-center gap-2 text-xs text-text-secondary", children: [_jsx(SlidersHorizontal, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Filters" })] }) }), _jsx(PopoverContent, { className: "w-64 p-4", children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(Label, { htmlFor: "show-community", className: "text-xs font-medium text-text-primary", children: "Community Photos" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Include photos from the wider Plano community." })] }), _jsx(Switch, { id: "show-community", checked: showCommunityImages, onCheckedChange: setShowCommunityImages })] }) })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" }), _jsx(Input, { placeholder: "Search reviews...", value: searchQuery, onChange: (e) => handleSearchChange(e.target.value), className: "pl-9 bg-surface-muted/50 border-transparent focus:bg-surface-default transition-colors" }), searchQuery && (_jsx("button", { onClick: () => handleSearchChange(""), className: "absolute right-3 top-1/2 -translate-y-1/2", children: _jsx(X, { className: "h-4 w-4 text-text-secondary hover:text-text-primary" }) }))] }), _jsx(Button, { variant: "secondary", size: "icon", className: "shrink-0", onClick: () => {
                                                                if (activeFilter === "pending") {
                                                                    navigate(`/search?rated_by=${profile?.username || ""}&open_filters=true&mode=library&status=visited%2Csaved%2Cpending`);
                                                                }
                                                                else {
                                                                    navigate(`/search?rated_by=${profile?.username || ""}&open_filters=true`);
                                                                }
                                                            }, title: "View on a map", "aria-label": "View on a map", children: _jsx(MapIcon, { className: "h-4 w-4" }) })] })] }), _jsxs("div", { className: "mt-0", children: [contentLoading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) })) : filteredContent.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(WidgetErrorBoundary, { children: _jsx(AnimatePresence, { mode: "wait", children: viewMode === 'grid' ? (_jsx(motion.div, { variants: variants, initial: "initial", animate: "animate", exit: "exit", transition: { duration: 0.25 }, children: _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-20", children: filteredContent.map((item) => (_jsx(ReviewCard, { entry: item, onLike: handleLike, hideUser: true, variant: "compact", showCommunityImages: showCommunityImages }, item.id))) }) }, "grid")) : viewMode === 'list' ? (_jsx(motion.div, { variants: variants, initial: "initial", animate: "animate", exit: "exit", transition: { duration: 0.25 }, children: _jsx(ProfileListView, { data: filteredContent, isOwnProfile: isOwnProfile, onUpdate: handleUpdate }) }, "list")) : (_jsx(motion.div, { variants: variants, initial: "initial", animate: "animate", exit: "exit", transition: { duration: 0.25 }, children: _jsx("div", { className: "-mx-4", children: _jsxs(DndContext, { sensors: sensors, onDragStart: handleDragStart, onDragEnd: handleDragEnd, children: [_jsx(ProfileKanbanView, { kanbanData: kanbanData, showCommunityImages: showCommunityImages, updatingItemId: updatingItemId, isDragEnabled: isOwnProfile }), _jsx(DragOverlay, { dropAnimation: null, children: activeId ? (_jsx("div", { className: "w-[280px] scale-105 shadow-xl z-50 cursor-grabbing rounded-sm bg-surface-card border overflow-hidden opacity-90", children: (() => {
                                                                                            const activeItem = content.find((i) => i.id === activeId);
                                                                                            return activeItem ? (_jsx(ReviewCard, { entry: activeItem, variant: "compact", hideUser: true, imagePosition: "left", showCommunityImages: showCommunityImages })) : null;
                                                                                        })() })) : null })] }) }) }, "kanban")) }) }), _jsx("div", { ref: containerRef, className: "h-4 w-full" })] })) : (
                                                // Empty States
                                                (searchQuery) ? (_jsx(EmptyState, { icon: Search, label: "No results found" })) : activeFilter === 'visited' ? (_jsx(EmptyState, { icon: Building2, label: "No visited buildings yet" })) : activeFilter === 'pending' ? (_jsx(EmptyState, { icon: Bookmark, label: "Bucket List is empty", description: isOwnProfile ? "Never forget a recommendation again. Add buildings here to build your personal queue." : undefined, action: isOwnProfile ? _jsx(Button, { onClick: () => navigate("/search"), children: "Search Buildings" }) : undefined })) : (_jsx(EmptyState, { icon: Building2, label: "No activity yet" }))), isFetchingMore && (_jsx("div", { className: "flex justify-center py-4", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) }))] })] })] }), _jsx(Dialog, { open: userListDialog.open, onOpenChange: (open) => setUserListDialog(prev => ({ ...prev, open })), children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { className: "capitalize text-center", children: userListDialog.type }) }), _jsx(ScrollArea, { className: "max-h-[60vh]", children: userListLoading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) })) : userList.length > 0 ? (_jsx("div", { className: "space-y-1 p-1", children: userList.map((u) => (_jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg hover:bg-surface-muted/50 cursor-pointer transition-colors", onClick: () => { setUserListDialog(prev => ({ ...prev, open: false })); navigate(`/profile/${u.username?.toLowerCase()}`); }, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Avatar, { children: [_jsx(AvatarImage, { src: u.avatar_url || undefined }), _jsx(AvatarFallback, { children: u.username?.charAt(0).toUpperCase() })] }), _jsx("span", { className: "font-medium", children: u.username || "Unknown" })] }), currentUser && currentUser.id !== u.id && (_jsx("div", { onClick: (e) => e.stopPropagation(), children: _jsx(FollowButton, { userId: u.id, initialIsFollowing: u.is_following, isFollower: u.is_follower, className: "h-8 text-xs px-3" }) }))] }, u.id))) })) : (_jsx("div", { className: "text-center py-8 text-text-secondary", children: "No users found" })) })] }) }), currentUser && (_jsx(CreateCollectionDialog, { open: showCreateCollection, onOpenChange: setShowCreateCollection, userId: currentUser.id, onSuccess: () => {
                                setCollectionsRefreshKey(prev => prev + 1);
                                setShowCreateCollection(false);
                            } }))] })] }) }));
}
function EmptyState({ icon: Icon, label, description, action }) {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center text-center py-16 px-8 gap-4", children: [_jsx(Icon, { className: "h-12 w-12 text-text-disabled" }), _jsx("p", { className: "text-lg font-semibold text-text-primary", children: label }), description && _jsx("p", { className: "text-sm text-text-secondary max-w-sm", children: description }), action && _jsx("div", { children: action })] }));
}
