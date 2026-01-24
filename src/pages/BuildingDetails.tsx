import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Loader2, MapPin, Calendar, Send,
  Edit2, Check, Bookmark, Star, MessageSquarePlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { MetaHead } from "@/components/common/MetaHead";
import { BuildingMap } from "@/components/common/BuildingMap";
import { PersonalRatingButton } from "@/components/PersonalRatingButton";
import { UserPicker } from "@/components/common/UserPicker";
import { fetchBuildingDetails, fetchUserBuildingStatus, upsertUserBuilding } from "@/utils/supabaseFallback";
import { parseLocation } from "@/utils/location";

// --- Types ---
interface BuildingDetails {
  id: string;
  name: string;
  location: any; // PostGIS point handling usually requires parsing
  address: string;
  architects: string[];
  year_completed: number;
  styles: string[];
  main_image_url: string | null;
  description: string;
  created_by: string;
}

interface FeedEntry {
  id: string;
  content: string | null;
  rating: number | null;
  status: 'visited' | 'pending';
  tags: string[] | null;
  created_at: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
}

export default function BuildingDetails() {
  const { id } = useParams();
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

  // Note & Tags
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Visit With state
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  // Map state
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Parse location
  const coordinates = useMemo(() => {
    return parseLocation(building?.location);
  }, [building]);

  useEffect(() => {
    if (id) fetchBuildingData();
  }, [id, user]);

  const fetchBuildingData = async () => {
    setLoading(true);
    if (!id) return;

    try {
      // 1. Fetch Building (with fallback logic in utility)
      const data = await fetchBuildingDetails(id);

      // Sanitize main_image_url to ensure it's null if empty string
      const sanitizedBuilding = {
        ...data,
        main_image_url: data.main_image_url || null
      };

      setBuilding(sanitizedBuilding as unknown as BuildingDetails);

      if (user && data.created_by === user.id) {
          setIsCreator(true);
      }

      if (user) {
        // 2. Fetch User Entry (Direct Supabase call)
        const { data: userEntry, error: userEntryError } = await supabase
            .from("user_buildings")
            .select("*")
            .eq("user_id", user.id)
            .eq("building_id", id)
            .maybeSingle();

        if (userEntry) {
            setUserStatus(userEntry.status);
            setMyRating(userEntry.rating || 0);
            setNote(userEntry.content || "");
            setTags(userEntry.tags || []);
            if (userEntry.content || (userEntry.tags && userEntry.tags.length > 0)) {
                setShowNoteEditor(true);
            }
        } else if (userEntryError) {
            console.error("Error fetching user status:", userEntryError);
        }

        // 3. Fetch Social Feed (Direct Supabase call)
        console.log("Fetching social feed for building:", id);

        const { data: entriesData, error: entriesError } = await supabase
          .from("user_buildings")
          .select(`
            id, content, rating, status, tags, created_at,
            user:profiles(username, avatar_url)
          `)
          .eq("building_id", id)
          .order("created_at", { ascending: false });
          
        if (entriesError) {
             console.warn("Error fetching feed:", entriesError);
             toast({ variant: "destructive", title: "Could not load activity feed" });
        } else if (entriesData) {
            console.log("Fetched feed entries:", entriesData);
            // Sanitize entries
            const sanitizedEntries = entriesData.map((e: any) => ({
                ...e,
                user: {
                    ...e.user,
                    avatar_url: e.user.avatar_url || null
                }
            }));
            setEntries(sanitizedEntries);
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

      setShowNoteEditor(true);
      // Optimistic Update
      setUserStatus(newStatus);
      // Rating persists (myRating state is not changed to 0)

      try {
          const { error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: building.id,
              status: newStatus,
              rating: myRating > 0 ? myRating : null,
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' });

          if (error) throw error;

          toast({ title: newStatus === 'visited' ? "Marked as Visited" : "Added to Pending" });
      } catch (error) {
          console.error("Status update failed", error);
          toast({ variant: "destructive", title: "Failed to save status" });
          fetchBuildingData(); // Revert
      }
  };

  const handleRate = async (buildingId: string, rating: number) => {
       if (!user || !building) return;

       setShowNoteEditor(true);
       setMyRating(rating);

       // Default to 'visited' if no status is set, otherwise keep current status
       const statusToUse = userStatus || 'visited';
       if (!userStatus) {
           setUserStatus('visited');
       }

       try {
           const { error } = await supabase.from("user_buildings").upsert({
               user_id: user.id,
               building_id: building.id,
               status: statusToUse,
               rating: rating,
               edited_at: new Date().toISOString()
           }, { onConflict: 'user_id, building_id' });

           if (error) throw error;

           toast({ title: "Rating saved" });
       } catch (error) {
           console.error("Rating failed", error);
           toast({ variant: "destructive", title: "Failed to save rating" });
           fetchBuildingData();
       }
  };

  const handleSaveNote = async () => {
      if (!user || !building) return;
      setIsSavingNote(true);

      const statusToUse = userStatus || 'visited';
      if (!userStatus) setUserStatus('visited');

      try {
          const { error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: building.id,
              status: statusToUse,
              rating: myRating > 0 ? myRating : null,
              content: note,
              tags: tags,
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' });

          if (error) throw error;
          toast({ title: "Note saved" });
      } catch (error: any) {
          console.error("Save note failed", error);
          toast({ variant: "destructive", title: "Failed to save note" });
      } finally {
          setIsSavingNote(false);
      }
  };

  const handleSendInvites = async () => {
    if (!user || !building || selectedFriends.length === 0) return;
    setSendingInvites(true);
    try {
        const status = "visit_with";

        const { error: recError } = await supabase
            .from("recommendations")
            .insert(
                selectedFriends.map(recipientId => ({
                    recommender_id: user.id,
                    recipient_id: recipientId,
                    building_id: building.id,
                    status: status
                }))
            );

        if (recError) throw recError;

        toast({ title: "Invites sent!", description: `Sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}.` });
        setSelectedFriends([]);
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send invites." });
    } finally {
        setSendingInvites(false);
    }
  };

  if (loading || !building) return <AppLayout title="Loading..."><div className="p-8"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout title={building.name} showBack>
      <MetaHead title={building.name} image={building.main_image_url || undefined} />

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 max-w-7xl mx-auto p-4 lg:p-8">
        
        {/* LEFT: Visuals & Map (Map-First Experience ) */}
        <div className="space-y-6">
            {/* Map Integration */}
            {coordinates ? (
              <BuildingMap
                lat={coordinates.lat}
                lng={coordinates.lng}
                className={isMapExpanded ? "fixed inset-0 z-[100] h-screen w-screen rounded-none border-0" : "h-48 w-full transition-all duration-300"}
                status={userStatus}
                isExpanded={isMapExpanded}
                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
              />
            ) : (
              <div className="h-48 bg-muted/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center flex-col gap-2 text-muted-foreground">
                <MapPin className="w-6 h-6 opacity-50" />
                <span className="text-xs uppercase tracking-widest">Location Unavailable</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{building.address}</span>
            </div>

            <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-lg border border-white/10 relative group">
                {building.main_image_url ? (
                    <img src={building.main_image_url} className="w-full h-full object-cover" alt={building.name} />
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-center p-4">No image yet - be the first to add a photo of this building</div>
                )}
            </div>
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PersonalRatingButton
                            buildingId={building.id}
                            initialRating={myRating}
                            onRate={handleRate}
                            status={userStatus || 'visited'}
                            label={userStatus === 'pending' ? "Priority" : "Rating"}
                            variant="inline"
                        />
                        {userStatus === 'pending' && (
                            <span className="text-xs text-muted-foreground ml-2">(Priority)</span>
                        )}
                    </div>

                    <Button variant="outline" size="sm" asChild>
                        <Link to={`/building/${id}/review`}>
                            <MessageSquarePlus className="w-4 h-4 mr-2" />
                            {myRating > 0 ? "Edit Review" : "Write Review"}
                        </Link>
                    </Button>
                </div>

                {/* Note & Tags Editor */}
                {showNoteEditor && (
                    <div className="pt-4 border-t border-dashed space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium uppercase text-muted-foreground">Private Note</label>
                            <Textarea
                                placeholder="Write a private note..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="resize-none"
                            />
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs font-medium uppercase text-muted-foreground">Tags</label>
                             <TagInput
                                tags={tags}
                                setTags={setTags}
                                placeholder="Add tags..."
                             />
                        </div>
                        <div className="flex justify-end">
                            <Button size="sm" onClick={handleSaveNote} disabled={isSavingNote}>
                                {isSavingNote && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Note
                            </Button>
                        </div>
                    </div>
                )}

                {/* Visit With Feature - Only visible when status is 'pending' */}
                {userStatus === 'pending' && (
                    <div className="pt-4 border-t border-dashed">
                        <label className="text-sm font-medium mb-2 block">Visit with...</label>
                        <div className="flex gap-2 items-start">
                            <div className="flex-1">
                                <UserPicker
                                    selectedIds={selectedFriends}
                                    onSelect={(id) => setSelectedFriends([...selectedFriends, id])}
                                    onRemove={(id) => setSelectedFriends(selectedFriends.filter(uid => uid !== id))}
                                />
                            </div>
                            <Button
                                size="sm"
                                disabled={selectedFriends.length === 0 || sendingInvites}
                                onClick={handleSendInvites}
                            >
                                {sendingInvites ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Invite friends to join you. They'll get a notification.
                        </p>
                    </div>
                )}
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
