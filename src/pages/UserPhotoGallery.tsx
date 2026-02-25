import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Image as ImageIcon, Heart } from "lucide-react";
import { getBuildingImageUrl } from "@/utils/image";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Photo {
  id: string;
  storage_path: string;
  likes_count: number;
  is_liked: boolean;
  review_id: string;
  building: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function UserPhotoGallery() {
  const { user: currentUser } = useAuth();
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'recent' | 'popular'>('recent');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const { containerRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    const resolveUser = async () => {
      setLoading(true);
      let resolvedUserId: string | null = null;
      let resolvedUsername: string | null = null;

      // 1. Resolve User
      if (routeUsername) {
        // Check if UUID or Username
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeUsername);

        let query = supabase.from("profiles").select("id, username");
        if (isUuid) {
          query = query.eq("id", routeUsername);
        } else {
          query = query.ilike("username", routeUsername);
        }

        const { data } = await query.maybeSingle();
        if (data) {
          resolvedUserId = data.id;
          resolvedUsername = data.username;
        }
      } else if (currentUser) {
        resolvedUserId = currentUser.id;
        // Fetch username for display
        const { data } = await supabase.from("profiles").select("username").eq("id", resolvedUserId).single();
        resolvedUsername = data?.username || "Me";
      }

      setTargetUserId(resolvedUserId);
      setProfileUsername(resolvedUsername);

      // If no user found, we stop loading
      if (!resolvedUserId) {
         setLoading(false);
      } else {
         // Reset photos/page when user changes
         setPhotos([]);
         setPage(0);
         setHasMore(true);
      }
    };

    resolveUser();
  }, [routeUsername, currentUser]);

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!targetUserId) return;

      if (page === 0) setLoading(true);
      else setFetchingMore(true);

      const from = page * 24;
      const to = from + 24 - 1;

      // 2. Fetch Photos
      const { data, error } = await supabase
        .from("review_images")
        .select(`
          id,
          storage_path,
          likes_count,
          review_id,
          user_buildings!review_images_review_id_fkey (
            building:buildings (
              id,
              name,
              slug
            )
          )
        `)
        .eq("user_id", targetUserId)
        .order(sortOrder === 'popular' ? "likes_count" : "created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching photos:", error);
      } else if (data) {
        if (data.length < 24) {
          setHasMore(false);
        }

        const photoIds = data.map((p) => p.id);
        let likedIds = new Set<string>();

        if (currentUser && photoIds.length > 0) {
          const { data: likesData } = await supabase
            .from("image_likes")
            .select("image_id")
            .eq("user_id", currentUser.id)
            .in("image_id", photoIds);

          if (likesData) {
            likesData.forEach((l) => likedIds.add(l.image_id));
          }
        }

        const mappedPhotos = data.map((item: any) => ({
          id: item.id,
          storage_path: item.storage_path,
          likes_count: item.likes_count || 0,
          is_liked: likedIds.has(item.id),
          review_id: item.review_id,
          building: item.user_buildings?.building || null
        }));

        setPhotos(prev => page === 0 ? mappedPhotos : [...prev, ...mappedPhotos]);
      }

      setLoading(false);
      setFetchingMore(false);
    };

    fetchPhotos();
  }, [targetUserId, page, sortOrder, currentUser]);

  useEffect(() => {
    if (isVisible && hasMore && !loading && !fetchingMore) {
      setPage(prev => prev + 1);
    }
  }, [isVisible, hasMore, loading, fetchingMore]);

  const handleSortChange = (val: string) => {
    if (val === 'recent' || val === 'popular') {
      setSortOrder(val);
      setPage(0);
      setPhotos([]);
      setHasMore(true);
    }
  };

  const handleLike = async (e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) return;

    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    const wasLiked = photo.is_liked;

    // Optimistic Update
    setPhotos(prev => prev.map(p => {
       if (p.id === photoId) {
          return {
             ...p,
             is_liked: !p.is_liked,
             likes_count: p.is_liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1
          };
       }
       return p;
    }));

    try {
       if (wasLiked) {
          const { error } = await supabase
            .from("image_likes")
            .delete()
            .eq("user_id", currentUser.id)
            .eq("image_id", photoId);
          if (error) throw error;
       } else {
          const { error } = await supabase
            .from("image_likes")
            .insert({
               user_id: currentUser.id,
               image_id: photoId
            });
          if (error) throw error;
       }
    } catch (err) {
       console.error("Error toggling like:", err);
       // Revert
       setPhotos(prev => prev.map(p => {
          if (p.id === photoId) {
             return {
                ...p,
                is_liked: wasLiked,
                likes_count: photo.likes_count // Restore original count
             };
          }
          return p;
       }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileUsername) {
     return (
        <AppLayout title="Not Found" showBack>
           <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
             <p>User not found.</p>
           </div>
        </AppLayout>
     )
  }

  return (
    <AppLayout title={`${profileUsername}'s Photos`} showBack showLogo={false}>
      <div className="p-4">
        {photos.length > 0 && (
          <div className="flex justify-end mb-4">
            <Select value={sortOrder} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {photos.length === 0 ? (
           <div className="flex flex-col items-center justify-center min-h-[40vh] text-muted-foreground gap-2">
             <div className="bg-secondary/50 p-4 rounded-full">
                <ImageIcon className="h-8 w-8 opacity-50" />
             </div>
             <p>No photos uploaded yet.</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-4">
            {photos.map((photo) => {
               const imageUrl = getBuildingImageUrl(photo.storage_path);
               const linkUrl = photo.building ? `/building/${photo.building.id}/${photo.building.slug}` : "#";

               return (
                 <Link
                    key={photo.id}
                    to={linkUrl}
                    className="relative aspect-square overflow-hidden rounded-md bg-secondary/20 group block"
                 >
                    <img
                      src={imageUrl}
                      alt={photo.building?.name || "User photo"}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                    {/* Like Button */}
                    <button
                      onClick={(e) => handleLike(e, photo.id)}
                      className="absolute top-2 right-2 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-sm group/btn z-10 flex items-center gap-1.5"
                    >
                      <Heart
                         className={cn(
                           "w-4 h-4 transition-colors",
                           photo.is_liked ? "fill-red-500 text-red-500" : "text-white"
                         )}
                      />
                      {photo.likes_count > 0 && (
                        <span className="text-xs font-medium text-white">{photo.likes_count}</span>
                      )}
                    </button>

                    {photo.building && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                         <p className="text-white text-xs truncate font-medium">{photo.building.name}</p>
                      </div>
                    )}
                 </Link>
               );
            })}

            {hasMore && (
              <div
                data-testid="sentinel"
                ref={containerRef}
                className="col-span-full flex items-center justify-center p-4 min-h-[50px]"
              >
                {fetchingMore && (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
