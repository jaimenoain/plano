import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { getBuildingImageUrl } from "@/utils/image";
import { useAuth } from "@/hooks/useAuth";

interface Photo {
  id: string;
  storage_path: string;
  likes_count: number;
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
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let targetUserId: string | null = null;
      let targetUsername: string | null = null;

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
          targetUserId = data.id;
          targetUsername = data.username;
        }
      } else if (currentUser) {
        targetUserId = currentUser.id;
        // Fetch username for display
         const { data } = await supabase.from("profiles").select("username").eq("id", targetUserId).single();
         targetUsername = data?.username || "Me";
      }

      if (!targetUserId) {
        setLoading(false);
        return;
      }

      setProfileUsername(targetUsername);

      // 2. Fetch Photos
      // Join review_images -> user_buildings (as review_id) -> buildings
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
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching photos:", error);
      } else if (data) {
        const mappedPhotos = data.map((item: any) => ({
          id: item.id,
          storage_path: item.storage_path,
          likes_count: item.likes_count,
          review_id: item.review_id,
          building: item.user_buildings?.building || null
        }));
        setPhotos(mappedPhotos);
      }

      setLoading(false);
    };

    fetchData();
  }, [routeUsername, currentUser]);

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
                    {photo.building && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                         <p className="text-white text-xs truncate font-medium">{photo.building.name}</p>
                      </div>
                    )}
                 </Link>
               );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
