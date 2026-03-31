import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "@/features/feed/components/ReviewCard";
import { toast } from "sonner";
import { getBuildingImageUrl } from "@/utils/image";
export default function ArchitectDashboard() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [feedLoading, setFeedLoading] = useState(true);
    const [stats, setStats] = useState({
        totalVisits: 0,
        bucketLists: 0,
        averageRating: 0,
    });
    const [feedItems, setFeedItems] = useState([]);
    useEffect(() => {
        const checkAccessAndFetchStats = async () => {
            if (authLoading)
                return;
            if (!user) {
                navigate("/");
                return;
            }
            try {
                // 1. Check for verified architect claim
                const { data: claims, error: claimError } = await supabase
                    .from("architect_claims")
                    .select("architect_id, status")
                    .eq("user_id", user.id)
                    .eq("status", "verified")
                    .single();
                if (claimError || !claims) {
                    navigate("/");
                    return;
                }
                // 2. Fetch associated buildings
                const { data: buildings, error: buildError } = await supabase
                    .from("building_architects")
                    .select("building_id")
                    .eq("architect_id", claims.architect_id);
                if (buildError)
                    throw buildError;
                const buildingIds = buildings.map((b) => b.building_id);
                if (buildingIds.length === 0) {
                    setLoading(false);
                    setFeedLoading(false);
                    return;
                }
                // 3. Fetch aggregated stats from user_buildings
                // Total Visits (status = 'visited')
                const { count: visitedCount, error: visitError } = await supabase
                    .from("user_buildings")
                    .select("*", { count: "exact", head: true })
                    .in("building_id", buildingIds)
                    .eq("status", "visited");
                if (visitError)
                    throw visitError;
                // Bucket List (status = 'pending')
                const { count: pendingCount, error: pendingError } = await supabase
                    .from("user_buildings")
                    .select("*", { count: "exact", head: true })
                    .in("building_id", buildingIds)
                    .eq("status", "pending");
                if (pendingError)
                    throw pendingError;
                // Average Rating
                const { data: ratingsData, error: ratingError } = await supabase
                    .from("user_buildings")
                    .select("rating")
                    .in("building_id", buildingIds)
                    .not("rating", "is", null);
                if (ratingError)
                    throw ratingError;
                let avgRating = 0;
                if (ratingsData && ratingsData.length > 0) {
                    const totalRating = ratingsData.reduce((acc, curr) => acc + (curr.rating || 0), 0);
                    avgRating = totalRating / ratingsData.length;
                }
                setStats({
                    totalVisits: visitedCount || 0,
                    bucketLists: pendingCount || 0,
                    averageRating: avgRating,
                });
                // 4. Fetch Feed
                setFeedLoading(true);
                const { data: feedDataRaw, error: feedError } = await supabase
                    .from("user_buildings")
                    .select(`
            id,
            content,
            rating,
            status,
            created_at,
            edited_at,
            user_id,
            tags,
            user:profiles!user_id(username, avatar_url),
            building:buildings!building_id(
              id, name, address, year_completed, city, country, slug,
              hero_image:review_images!hero_image_id(storage_path),
              architects:building_architects(
                architect:architects(name)
              )
            ),
            images:review_images(id, storage_path, likes_count),
            likes:likes(count),
            comments:comments(count),
            my_likes:likes!interaction_id(user_id)
          `)
                    .in("building_id", buildingIds)
                    .order("created_at", { ascending: false })
                    .limit(20);
                if (feedError)
                    throw feedError;
                const rawRows = (feedDataRaw ?? []);
                const mappedFeed = rawRows.map((item) => {
                    const isLiked = item.my_likes && Array.isArray(item.my_likes)
                        ? item.my_likes.some((l) => l.user_id === user.id)
                        : false;
                    const images = item.images?.map((img) => ({
                        id: img.id,
                        url: getBuildingImageUrl(img.storage_path) || "",
                        likes_count: img.likes_count || 0,
                        is_liked: false
                    })) || [];
                    const uRaw = item.user;
                    const u = Array.isArray(uRaw) ? uRaw[0] : uRaw;
                    const bRaw = item.building;
                    const buildingRow = Array.isArray(bRaw) ? bRaw[0] : bRaw;
                    const heroRaw = buildingRow?.hero_image;
                    const hero = Array.isArray(heroRaw) ? heroRaw[0] : heroRaw;
                    const architects = buildingRow?.architects
                        ?.map((a) => a.architect?.name)
                        .filter((n) => typeof n === "string" && n.length > 0) || [];
                    return {
                        id: item.id,
                        content: item.content,
                        rating: item.rating,
                        tags: item.tags,
                        created_at: item.created_at,
                        edited_at: item.edited_at,
                        status: item.status,
                        user_id: item.user_id,
                        user: {
                            username: u?.username || "Unknown",
                            avatar_url: u?.avatar_url || null,
                        },
                        building: {
                            id: buildingRow?.id ?? "",
                            name: buildingRow?.name ?? "",
                            address: buildingRow?.address,
                            slug: buildingRow?.slug,
                            city: buildingRow?.city,
                            country: buildingRow?.country,
                            year_completed: buildingRow?.year_completed,
                            main_image_url: hero?.storage_path || null,
                            architects: architects,
                        },
                        likes_count: item.likes?.[0]?.count || 0,
                        comments_count: item.comments?.[0]?.count || 0,
                        is_liked: isLiked,
                        images: images,
                    };
                });
                setFeedItems(mappedFeed);
            }
            catch (_error) {
                toast.error("Failed to load dashboard data");
            }
            finally {
                setLoading(false);
                setFeedLoading(false);
            }
        };
        checkAccessAndFetchStats();
    }, [user, authLoading, navigate]);
    if (loading) {
        return (_jsxs("div", { className: "container max-w-7xl mx-auto py-8 px-4 space-y-8", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-10 w-64" }), _jsx(Skeleton, { className: "h-4 w-96" })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsx(Skeleton, { className: "h-32" }), _jsx(Skeleton, { className: "h-32" }), _jsx(Skeleton, { className: "h-32" })] })] }));
    }
    return (_jsxs("div", { className: "container max-w-7xl mx-auto py-8 px-4 space-y-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary", children: "Architect Dashboard" }), _jsx("p", { className: "text-text-secondary mt-2", children: "Track the impact of your work and see how the community engages with your projects." })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs(Card, { children: [_jsx(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium", children: "Total Visits" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: stats.totalVisits }), _jsx("p", { className: "text-xs text-text-secondary", children: "Community members who visited your buildings" })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium", children: "Bucket Lists" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: stats.bucketLists }), _jsx("p", { className: "text-xs text-text-secondary", children: "People who want to visit your buildings" })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium", children: "Average Rating" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "text-2xl font-bold", children: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Average community score across all projects" })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl font-semibold tracking-tight", children: "Community Feed" }), _jsx("p", { className: "text-text-secondary", children: "Recent reviews and photos of your buildings." }), feedLoading ? (_jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-64 w-full" }), _jsx(Skeleton, { className: "h-64 w-full" })] })) : feedItems.length === 0 ? (_jsx("div", { className: "py-12 text-center border rounded-lg bg-surface-muted/10", children: _jsx("p", { className: "text-text-secondary", children: "No recent activity found for your buildings." }) })) : (_jsx("div", { className: "grid gap-6 md:grid-cols-2 lg:grid-cols-3", children: feedItems.map((item) => (_jsx(ReviewCard, { entry: item }, item.id))) }))] })] }));
}
