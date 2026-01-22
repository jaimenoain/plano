import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Loader2, MapPin, Calendar, Send,
  Trash2, Edit2, Check, Bookmark, Navigation
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { MetaHead } from "@/components/common/MetaHead";
import { BuildingMap } from "@/components/common/BuildingMap";
import { PersonalRatingButton } from "@/components/PersonalRatingButton";
import { Star } from "lucide-react"; // Kept for Community Notes display if needed, but PersonalRatingButton handles the input.

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

interface FeedEntry {
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
  const { profile } = useUserProfile();
  const { toast } = useToast();
  
  const [building, setBuilding] = useState<BuildingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  
  const canEdit = isCreator || profile?.role === 'admin';

  // User Interaction State
  const [userStatus, setUserStatus] = useState<'visited' | 'pending' | null>(null);
  const [myRating, setMyRating] = useState<number>(0); // Scale 1-5 
  const [entries, setEntries] = useState<FeedEntry[]>([]);

  // Parse location
  const coordinates = useMemo(() => {
    if (!building?.location) return null;

    // Case 1: GeoJSON Object
    if (typeof building.location === 'object' && building.location.coordinates) {
      return {
        lng: building.location.coordinates[0],
        lat: building.location.coordinates[1]
      };
    }

    // Case 2: WKT String "POINT(lng lat)"
    if (typeof building.location === 'string') {
      const match = building.location.match(/POINT\s*\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)/i);
      if (match) {
        return {
          lng: parseFloat(match[1]),
          lat: parseFloat(match[2])
        };
      }
    }

    return null;
  }, [building]);

  useEffect(() => {
    if (id) fetchBuildingData();
  }, [id, user]);

  const fetchBuildingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Building
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setBuilding(data);
      if (user && data.created_by === user.id) {
          setIsCreator(true);
      }

      if (user) {
        // 2. Fetch User Entry (using building_id)
        const { data: userEntry } = await supabase
          .from("user_buildings")
          .select("*")
          .eq("user_id", user.id)
          .eq("building_id", id)
          .maybeSingle();

        if (userEntry) {
            setUserStatus(userEntry.status);
            setMyRating(userEntry.rating || 0);
        }

        // 3. Fetch Social Feed
        // DEBUG: Explicitly log this fetch attempt
        console.log("Fetching social feed for building:", id);

        const { data: entriesData, error: entriesError } = await supabase
          .from("user_buildings")
          .select(`
            id, content, rating, status, tags, created_at,
            user:profiles(username, avatar_url)
          `)
          .eq("building_id", id)
          .order("created_at", { ascending: false });
          
        if (entriesError) console.error("Error fetching feed:", entriesError);
        if (entriesData) {
            console.log("Fetched feed entries:", entriesData);
            setEntries(entriesData as any);
        }
      } else {
        console.log("No user, skipping feed fetch");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({ variant: "destructive", title: "Error", description: "Building not found" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'visited' | 'pending') => {
      if (!user || !building) return;

      // Optimistic Update
      setUserStatus(newStatus);
      // Rating persists (myRating state is not changed to 0)

      const payload: any = {
          user_id: user.id,
          building_id: building.id,
          status: newStatus,
          rating: myRating > 0 ? myRating : null, // Persist existing rating
          updated_at: new Date().toISOString()
      };

      const { error } = await supabase
          .from("user_buildings")
          .upsert(payload, { onConflict: 'user_id, building_id' });

      if (error) {
          toast({ variant: "destructive", title: "Failed to save status" });
          fetchBuildingData(); // Revert
      } else {
          toast({ title: newStatus === 'visited' ? "Marked as Visited" : "Added to Pending" });
      }
  };

  const handleRate = async (buildingId: string, rating: number) => {
       if (!user || !building) return;

       setMyRating(rating);

       // Default to 'visited' if no status is set, otherwise keep current status
       const statusToUse = userStatus || 'visited';
       if (!userStatus) {
           setUserStatus('visited');
       }

       const payload: any = {
          user_id: user.id,
          building_id: building.id,
          status: statusToUse,
          rating: rating,
          updated_at: new Date().toISOString()
      };

      const { error } = await supabase
          .from("user_buildings")
          .upsert(payload, { onConflict: 'user_id, building_id' });

      if (error) {
          toast({ variant: "destructive", title: "Failed to save rating" });
          fetchBuildingData();
      } else {
          toast({ title: "Rating saved" });
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

            {/* Map Integration */}
            {coordinates ? (
              <BuildingMap
                lat={coordinates.lat}
                lng={coordinates.lng}
                className="h-48 w-full"
              />
            ) : (
              <div className="h-48 bg-muted/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center flex-col gap-2 text-muted-foreground">
                <MapPin className="w-6 h-6 opacity-50" />
                <span className="text-xs uppercase tracking-widest">Location Unavailable</span>
              </div>
            )}
        </div>

        {/* RIGHT: Data & Actions */}
        <div className="space-y-8 mt-6 lg:mt-0">
            
            {/* Header Info */}
            <div>
                <div className="flex justify-between items-start">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">{building.name}</h1>
                    {canEdit && (
                        <Button variant="ghost" size="icon" asChild>
                            <Link to={`/building/${id}/edit`}>
                                <Edit2 className="w-5 h-5" />
                            </Link>
                        </Button>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {building.year_completed && (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{building.year_completed}</span>
                        </div>
                    )}
                    {building.architects && (
                        <div className="flex items-center gap-1.5">
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
                {building.description && (
                  <p className="mt-4 text-muted-foreground">{building.description}</p>
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
                            onClick={() => handleStatusChange('pending')}
                        >
                            <Bookmark className={`w-4 h-4 mr-2 ${userStatus === 'pending' ? "fill-current" : ""}`} />
                            {userStatus === 'pending' ? "Pending" : "Save"}
                        </Button>
                        <Button 
                            variant={userStatus === 'visited' ? "default" : "outline"} 
                            size="sm"
                            onClick={() => handleStatusChange('visited')}
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Visited
                        </Button>
                    </div>
                </div>

                {/* PersonalRatingButton Integration */}
                <div className="flex items-center gap-2">
                    <PersonalRatingButton
                        buildingId={building.id}
                        initialRating={myRating}
                        onRate={handleRate}
                        status={userStatus || 'visited'}
                        label="Rate this building"
                    />
                    {userStatus === 'pending' && (
                        <span className="text-xs text-muted-foreground ml-2">(Priority)</span> // [cite: 53]
                    )}
                </div>
            </div>

            {/* Community Activity */}
            <div className="pt-4 border-t border-dashed">
                <h3 className="text-lg font-bold mb-4">Community Notes</h3>
                <div className="space-y-4">
                    {entries.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No one has visited this building yet.</p>
                    ) : (
                        entries.map(entry => (
                            <div key={entry.id} className="flex gap-4 p-4 bg-muted/10 rounded-lg">
                                <Avatar>
                                    <AvatarImage src={entry.user.avatar_url || undefined} />
                                    <AvatarFallback>{entry.user.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">{entry.user.username}</span>
                                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(entry.created_at))} ago</span>
                                    </div>
                                    {entry.status === 'visited' && entry.rating && (
                                        <div className="flex items-center gap-0.5 my-1">
                                            {[...Array(entry.rating)].map((_, i) => (
                                                <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                            ))}
                                        </div>
                                    )}
                                    {entry.content && <p className="text-sm mt-1 text-muted-foreground">{entry.content}</p>}
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
