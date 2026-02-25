import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "@/components/feed/ReviewCard";
import { FeedReview } from "@/types/feed";
import { toast } from "sonner";
import { getBuildingImageUrl } from "@/utils/image";

export default function ArchitectDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVisits: 0,
    bucketLists: 0,
    averageRating: 0,
  });
  const [feedItems, setFeedItems] = useState<FeedReview[]>([]);

  useEffect(() => {
    const checkAccessAndFetchStats = async () => {
      if (authLoading) return;

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
          console.log("No verified architect claim found", claimError);
          navigate("/");
          return;
        }

        // 2. Fetch associated buildings
        const { data: buildings, error: buildError } = await supabase
          .from("building_architects")
          .select("building_id")
          .eq("architect_id", claims.architect_id);

        if (buildError) throw buildError;

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

        if (visitError) throw visitError;

        // Bucket List (status = 'pending')
        const { count: pendingCount, error: pendingError } = await supabase
          .from("user_buildings")
          .select("*", { count: "exact", head: true })
          .in("building_id", buildingIds)
          .eq("status", "pending");

        if (pendingError) throw pendingError;

        // Average Rating
        const { data: ratingsData, error: ratingError } = await supabase
          .from("user_buildings")
          .select("rating")
          .in("building_id", buildingIds)
          .not("rating", "is", null);

        if (ratingError) throw ratingError;

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

        if (feedError) throw feedError;

        const mappedFeed: FeedReview[] = (feedDataRaw || []).map((item: any) => {
          // Check if current user liked it
          // item.my_likes will be an array of { user_id }
          const isLiked = item.my_likes && Array.isArray(item.my_likes)
            ? item.my_likes.some((l: any) => l.user_id === user.id)
            : false;

          const images = item.images?.map((img: any) => ({
             id: img.id,
             url: getBuildingImageUrl(img.storage_path) || "",
             likes_count: img.likes_count || 0,
             is_liked: false // We aren't fetching image likes for simplicity yet
          })) || [];

          const architects = item.building?.architects?.map((a: any) => a.architect?.name).filter(Boolean) || [];

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
              username: item.user?.username || "Unknown",
              avatar_url: item.user?.avatar_url || null,
            },
            building: {
              id: item.building?.id,
              name: item.building?.name,
              address: item.building?.address,
              slug: item.building?.slug,
              city: item.building?.city,
              country: item.building?.country,
              year_completed: item.building?.year_completed,
              main_image_url: item.building?.hero_image?.storage_path || null,
              architects: architects,
            },
            likes_count: item.likes?.[0]?.count || 0,
            comments_count: item.comments?.[0]?.count || 0,
            is_liked: isLiked,
            images: images,
          };
        });

        setFeedItems(mappedFeed);

      } catch (error) {
        console.error("Error loading architect dashboard:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
        setFeedLoading(false);
      }
    };

    checkAccessAndFetchStats();
  }, [user, authLoading, navigate]);

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Architect Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track the impact of your work and see how the community engages with your projects.
        </p>
      </div>

      {/* Metrics Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">
              Community members who visited your buildings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bucket Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bucketLists}</div>
            <p className="text-xs text-muted-foreground">
              People who want to visit your buildings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average community score across all projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feed Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Community Feed</h2>
        <p className="text-muted-foreground">Recent reviews and photos of your buildings.</p>

        {feedLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : feedItems.length === 0 ? (
          <div className="py-12 text-center border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">No recent activity found for your buildings.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {feedItems.map((item) => (
                <ReviewCard key={item.id} entry={item} />
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
