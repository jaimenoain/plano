import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Loader2, MapPin, Calendar, Star, Send, 
  Trash2, Edit2, Check, Bookmark, Navigation
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { MetaHead } from "@/components/common/MetaHead";

// --- Types ---
interface BuildingDetails {
  id: string;
  name: string;
  location: any; // PostGIS point handling usually requires parsing
  address: string;
  architects: string[];
  year_completed: number;
  styles: string[];
  main_image_url: string;
  description: string;
  created_by: string;
}

interface FeedReview {
  id: string;
  content: string | null;
  rating: number | null;
  status: 'visited' | 'pending'; // Updated Enum 
  tags: string[] | null;
  created_at: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
}

export default function BuildingDetails() {
  const { id } = useParams(); // ID is now always UUID 
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [building, setBuilding] = useState<BuildingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // User Interaction State
  const [userStatus, setUserStatus] = useState<'visited' | 'pending' | null>(null);
  const [myRating, setMyRating] = useState<number>(0); // Scale 1-5 
  const [reviews, setReviews] = useState<FeedReview[]>([]);

  useEffect(() => {
    if (id) fetchBuildingData();
  }, [id, user]);

  const fetchBuildingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Building (No TMDB fallback) 
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setBuilding(data);

      if (user) {
        // 2. Fetch User Log (using building_id) 
        const { data: logData } = await supabase
          .from("log")
          .select("*")
          .eq("user_id", user.id)
          .eq("building_id", id)
          .maybeSingle();

        if (logData) {
            setUserStatus(logData.status);
            setMyRating(logData.rating || 0);
        }

        // 3. Fetch Social Feed
        const { data: reviewData } = await supabase
          .from("log")
          .select(`
            id, content, rating, status, tags, created_at,
            user:profiles(username, avatar_url)
          `)
          .eq("building_id", id)
          .order("created_at", { ascending: false });
          
        if (reviewData) setReviews(reviewData as any);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({ variant: "destructive", title: "Error", description: "Building not found" });
    } finally {
      setLoading(false);
    }
  };

  const handleInteraction = async (status: 'visited' | 'pending', rating?: number) => {
      if (!user || !building) return;
      
      const newRating = rating !== undefined ? rating : myRating;
      const newStatus = status;

      // Optimistic Update
      setUserStatus(newStatus);
      if (rating) setMyRating(rating);

      const payload: any = {
          user_id: user.id,
          building_id: building.id, // Updated Foreign Key 
          status: newStatus,
          updated_at: new Date().toISOString()
      };

      if (newStatus === 'visited' && newRating > 0) {
          payload.rating = newRating; // 1-5 Integer constraint 
      } else {
          payload.rating = null;
      }

      const { error } = await supabase
          .from("log")
          .upsert(payload, { onConflict: 'user_id, building_id' });

      if (error) {
          toast({ variant: "destructive", title: "Failed to save" });
          fetchBuildingData(); // Revert on error
      } else {
          toast({ title: status === 'visited' ? "Marked as Visited" : "Added to Pending" });
      }
  };

  if (loading || !building) return <AppLayout title="Loading..."><div className="p-8"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout title={building.name} showBack>
      <MetaHead title={building.name} image={building.main_image_url} />

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 max-w-7xl mx-auto p-4 lg:p-8">
        
        {/* LEFT: Visuals & Map (Map-First Experience ) */}
        <div className="space-y-6">
            <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-lg border border-white/10 relative group">
                {building.main_image_url ? (
                    <img src={building.main_image_url} className="w-full h-full object-cover" alt={building.name} />
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">No Image</div>
                )}
                {/* Overlay Address */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                    <div className="flex items-center gap-2 text-white/90">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{building.address}</span>
                    </div>
                </div>
            </div>

            {/* Placeholder for OpenFreeMap Integration [cite: 7] */}
            <div className="h-48 bg-muted/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center flex-col gap-2 text-muted-foreground">
                <MapPin className="w-6 h-6 opacity-50" />
                <span className="text-xs uppercase tracking-widest">Map View Unavailable</span>
            </div>
        </div>

        {/* RIGHT: Data & Actions */}
        <div className="space-y-8 mt-6 lg:mt-0">
            
            {/* Header Info */}
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-2">{building.name}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {building.year_completed && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{building.year_completed}</span>
                        </div>
                    )}
                    {building.architects && (
                        <div className="flex items-center gap-1.5">
                            <Edit2 className="w-4 h-4" />
                            <span>{building.architects.join(", ")}</span>
                        </div>
                    )}
                </div>
                
                {/* Styles Tags */}
                {building.styles && (
                    <div className="flex gap-2 mt-4">
                        {building.styles.map(style => (
                            <Badge key={style} variant="outline" className="border-white/20">{style}</Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* ACTION CENTER: Contextual Rating UI [cite: 52] */}
            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        {userStatus === 'visited' ? 'Your Rating' : 'Your Interest'}
                    </h3>
                    
                    {/* Toggle Status */}
                    <div className="flex gap-2">
                        <Button 
                            variant={userStatus === 'pending' ? "default" : "outline"} 
                            size="sm"
                            onClick={() => handleInteraction('pending')}
                        >
                            <Bookmark className={`w-4 h-4 mr-2 ${userStatus === 'pending' ? "fill-current" : ""}`} />
                            {userStatus === 'pending' ? "Pending" : "Save"}
                        </Button>
                        <Button 
                            variant={userStatus === 'visited' ? "default" : "outline"} 
                            size="sm"
                            onClick={() => handleInteraction('visited')}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Visited
                        </Button>
                    </div>
                </div>

                {/* Star System (1-5 Scale)  */}
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleInteraction('visited', star)}
                            className="focus:outline-none transition-transform hover:scale-110"
                        >
                            <Star 
                                className={`w-8 h-8 ${star <= myRating && userStatus === 'visited' 
                                    ? "fill-yellow-500 text-yellow-500" 
                                    : "fill-transparent text-muted-foreground/30 hover:text-yellow-500/50"}`} 
                            />
                        </button>
                    ))}
                    {userStatus === 'pending' && (
                        <span className="text-xs text-muted-foreground ml-2">(Priority)</span> // [cite: 53]
                    )}
                </div>
            </div>

            {/* Community Activity */}
            <div className="pt-4 border-t border-dashed">
                <h3 className="text-lg font-bold mb-4">Community Notes</h3>
                <div className="space-y-4">
                    {reviews.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No one has visited this building yet.</p>
                    ) : (
                        reviews.map(review => (
                            <div key={review.id} className="flex gap-4 p-4 bg-muted/10 rounded-lg">
                                <Avatar>
                                    <AvatarImage src={review.user.avatar_url || undefined} />
                                    <AvatarFallback>{review.user.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">{review.user.username}</span>
                                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(review.created_at))} ago</span>
                                    </div>
                                    {review.status === 'visited' && review.rating && (
                                        <div className="flex items-center gap-0.5 my-1">
                                            {[...Array(review.rating)].map((_, i) => (
                                                <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                            ))}
                                        </div>
                                    )}
                                    {review.content && <p className="text-sm mt-1 text-muted-foreground">{review.content}</p>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>
    </AppLayout>
  );
}
