import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Loader2, MapPin, Calendar, Send,
  Edit2, Check, Bookmark, MessageSquarePlus, Image as ImageIcon,
  Heart, ExternalLink, Circle, AlertTriangle, MessageSquare, Search
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, format } from "date-fns";
import { MetaHead } from "@/components/common/MetaHead";
import { BuildingMap } from "@/components/common/BuildingMap";
import { PersonalRatingButton } from "@/components/PersonalRatingButton";
import { UserPicker } from "@/components/common/UserPicker";
import { fetchBuildingDetails, fetchUserBuildingStatus, upsertUserBuilding } from "@/utils/supabaseFallback";
import { parseLocation } from "@/utils/location";
import { getBuildingImageUrl } from "@/utils/image";
import { ImageDetailsDialog } from "@/components/ImageDetailsDialog";
import { Architect } from "@/types/architect";
import { getBuildingUrl } from "@/utils/url";

// --- Types ---
interface BuildingDetails {
  id: string;
  short_id?: number | null;
  slug?: string | null;
  name: string;
  location: any; // PostGIS point handling usually requires parsing
  location_precision?: 'exact' | 'approximate';
  address: string;
  city: string | null;
  country: string | null;
  architects: Architect[];
  year_completed: number;
  styles: { id: string, name: string }[];
  created_by: string;
}

interface TopLink {
  link_id: string;
  url: string;
  title: string | null;
  like_count: number;
  user_username: string | null;
  user_avatar: string | null;
}

interface FeedEntry {
  id: string;
  user_id: string;
  content: string | null;
  rating: number | null;
  status: 'visited' | 'pending';
  tags: string[] | null;
  created_at: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  images: {
    id: string;
    storage_path: string;
    created_at?: string;
  }[];
}

interface DisplayImage {
    id: string;
    url: string;
    likes_count: number;
    created_at: string;
    user: {
        username: string | null;
        avatar_url: string | null;
    } | null;
}

// --- Reusable Header Component ---
interface BuildingHeaderProps {
  building: BuildingDetails;
  showEditLink: boolean;
  className?: string;
}

const BuildingHeader = ({ building, showEditLink, className }: BuildingHeaderProps) => {
    return (
        <div className={className}>
            <div className="flex justify-between items-start">
                <h1 className="text-4xl font-extrabold tracking-tight mb-2">{building.name}</h1>
                {showEditLink && (
                    <Button variant="ghost" size="icon" asChild>
                        <Link to={getBuildingUrl(building.id, building.slug, building.short_id) + "/edit"}>
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
                {(building.architects && building.architects.length > 0) && (
                    <div className="flex items-center gap-1.5">
                        {building.architects.map((arch, i) => (
                            <span key={arch.id}>
                                <Link to={`/architect/${arch.id}`} className="hover:underline text-primary">
                                    {arch.name}
                                </Link>
                                {i < building.architects.length - 1 && ", "}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Styles Tags */}
            {building.styles && building.styles.length > 0 && (
                <div className="flex gap-2 mt-4">
                    {building.styles.map(style => (
                        <Badge key={style.id} variant="outline" className="border-white/20">{style.name}</Badge>
                    ))}
                </div>
            )}
        </div>
    );
};

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
  const [displayImages, setDisplayImages] = useState<DisplayImage[]>([]);
  const [userImages, setUserImages] = useState<{id: string, storage_path: string}[]>([]);
  const [selectedImage, setSelectedImage] = useState<DisplayImage | null>(null);
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Note & Tags
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Visit With state
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  // Map state
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showDirectionsAlert, setShowDirectionsAlert] = useState(false);

  // Parse location
  const coordinates = useMemo(() => {
    return parseLocation(building?.location);
  }, [building]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMapExpanded) {
        setIsMapExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMapExpanded]);

  useEffect(() => {
    if (id) fetchBuildingData();
  }, [id, user]);

  const fetchBuildingData = async () => {
    setLoading(true);
    if (!id) return;

    try {
      // 1. Fetch Building (with fallback logic in utility)
      const data = await fetchBuildingDetails(id);
      const resolvedBuildingId = data.id;

      // 1.5 Fetch Relational Architects
      const { data: relationalArchitectsData } = await supabase
        .from("building_architects")
        .select("architect:architects(id, name)")
        .eq("building_id", resolvedBuildingId);

      const relationalArchitects = relationalArchitectsData
        ?.map((item: any) => item.architect)
        .filter((a: any) => a) || [];

      const sanitizedBuilding = {
        ...data,
        architects: relationalArchitects,
      };

      setBuilding(sanitizedBuilding as unknown as BuildingDetails);

      if (user && data.created_by === user.id) {
          setIsCreator(true);
      }

      // 1.8 Fetch Top Links (RPC) - non-blocking
      fetchTopLinks(resolvedBuildingId);

      if (user) {
        // 2. Fetch User Entry (Direct Supabase call)
        const { data: userEntry, error: userEntryError } = await supabase
            .from("user_buildings")
            .select("*, images:review_images(id, storage_path)")
            .eq("user_id", user.id)
            .eq("building_id", resolvedBuildingId)
            .maybeSingle();

        if (userEntry) {
            setUserStatus(userEntry.status);
            setMyRating(userEntry.rating || 0);
            setNote(userEntry.content || "");
            setTags(userEntry.tags || []);
            // @ts-ignore - Supabase types join inference can be tricky
            setUserImages(userEntry.images || []);
            setIsEditing(false);
            if (userEntry.content || (userEntry.tags && userEntry.tags.length > 0)) {
                setShowNoteEditor(true);
            }
        } else {
            setIsEditing(true);
            if (userEntryError) {
                console.error("Error fetching user status:", userEntryError);
            }
        }
      }

      // 3. Fetch Social Feed (Direct Supabase call) - NOW GLOBAL
      console.log("Fetching social feed for building:", resolvedBuildingId);

      // Fetch follows for prioritization
      let followedIds = new Set<string>();
      if (user) {
        const { data: followsData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (followsData) {
          followedIds = new Set(followsData.map(f => f.following_id));
        }
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from("user_buildings")
        .select(`
          id, user_id, content, rating, status, tags, created_at,
          user:profiles(username, avatar_url),
          images:review_images(id, storage_path, likes_count, created_at)
        `)
        .eq("building_id", resolvedBuildingId)
        .order("created_at", { ascending: false });

      const communityImages: DisplayImage[] = [];

      if (entriesError) {
            console.warn("Error fetching feed:", entriesError);
            // toast({ variant: "destructive", title: "Could not load activity feed" });
      } else if (entriesData) {
          console.log("Fetched feed entries:", entriesData);
          
          // Extract images
          entriesData.forEach((entry: any) => {
              if (entry.images && entry.images.length > 0) {
                  entry.images.forEach((img: any) => {
                        const publicUrl = getBuildingImageUrl(img.storage_path);
                        if (publicUrl) {
                            communityImages.push({
                                id: img.id,
                                url: publicUrl,
                                likes_count: img.likes_count || 0,
                                created_at: img.created_at || entry.created_at,
                                user: entry.user
                            });
                        }
                  });
              }
          });

          // Sort images
          communityImages.sort((a, b) => {
              if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          // Sanitize entries
          let sanitizedEntries = entriesData.map((e: any) => ({
              ...e,
              user: {
                  ...e.user,
                  avatar_url: e.user.avatar_url || null
              },
              images: e.images || []
          }));

          // Sort entries: Followed users first, then by date (recency)
          sanitizedEntries.sort((a, b) => {
              const aIsFollowed = followedIds.has(a.user_id);
              const bIsFollowed = followedIds.has(b.user_id);

              if (aIsFollowed && !bIsFollowed) return -1;
              if (!aIsFollowed && bIsFollowed) return 1;

              // If both followed or both not followed, sort by date desc
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          setEntries(sanitizedEntries);
      }

      // Combine with main image
      setDisplayImages(communityImages);
    } catch (error: any) {
      console.error("Error:", error);
      toast({ variant: "destructive", title: "Error", description: "Building not found" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopLinks = async (buildingId: string) => {
      setLinksLoading(true);
      const { data: linksData, error: linksError } = await supabase
        .rpc('get_building_top_links', {
            p_building_id: buildingId
        });

      if (linksError) {
          console.warn("Error fetching top links:", linksError);
      } else if (linksData) {
          setTopLinks(linksData);
      }
      setLinksLoading(false);
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
          setIsEditing(false);
      } catch (error: any) {
          console.error("Save note failed", error);
          toast({ variant: "destructive", title: "Failed to save note" });
      } finally {
          setIsSavingNote(false);
      }
  };

  const handleDelete = async () => {
      if (!user || !building) return;

      try {
          const { error } = await supabase
              .from("user_buildings")
              .delete()
              .eq("user_id", user.id)
              .eq("building_id", building.id);

          if (error) throw error;

          setUserStatus(null);
          setMyRating(0);
          setNote("");
          setTags([]);
          setIsEditing(false);

          toast({ title: "Removed from list" });
      } catch (error) {
          console.error("Delete failed", error);
          toast({ variant: "destructive", title: "Failed to remove" });
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

  const googleSearchUrl = useMemo(() => {
    if (!building) return "";
    const query = [
      building.name,
      building.city,
      building.architects?.map(a => a.name).join(" ")
    ].filter(Boolean).join(" ");
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('udm', '2');
    return `https://www.google.com/search?${params.toString()}`;
  }, [building]);

  if (loading || !building) return <AppLayout title="Loading..."><div className="p-8"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout title={building.name} showBack>
      <MetaHead title={building.name} />

      {/* Building Header - Mobile Only */}
      <BuildingHeader building={building} showEditLink={!!user} className="lg:hidden p-4 pb-0" />

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 max-w-7xl mx-auto p-4 lg:p-8 pt-4">
        
        {/* LEFT: Visuals & Map (Map-First Experience ) */}
        <div className="space-y-6">
            <div className="space-y-2">
                {/* Map Integration */}
                {building.location_precision === 'approximate' && (
                    <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-500 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 stroke-amber-500 dark:stroke-amber-400" />
                        <AlertDescription className="ml-2">
                            Exact location not verified. This marker indicates the general village/locality.
                        </AlertDescription>
                    </Alert>
                )}

                {coordinates ? (
                <BuildingMap
                    lat={coordinates.lat}
                    lng={coordinates.lng}
                    className={isMapExpanded ? "fixed inset-0 z-[100] h-screen w-screen rounded-none border-0" : "h-48 w-full transition-all duration-300"}
                    status={userStatus}
                    isExpanded={isMapExpanded}
                    onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                    locationPrecision={building.location_precision}
                />
                ) : (
                <div className="h-48 bg-muted/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center flex-col gap-2 text-muted-foreground">
                    <MapPin className="w-6 h-6 opacity-50" />
                    <span className="text-xs uppercase tracking-widest">Location Unavailable</span>
                </div>
                )}

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">
                            {[building.city, building.country].filter(Boolean).join(", ") || building.address}
                        </span>
                    </div>
                    {coordinates && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0 h-8"
                                onClick={() => {
                                    if (building.location_precision === 'approximate') {
                                        setShowDirectionsAlert(true);
                                    } else {
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`, '_blank');
                                    }
                                }}
                            >
                                {building.location_precision === 'approximate' ? "Get Directions (Approximate)" : "Get Directions"}
                            </Button>

                            <AlertDialog open={showDirectionsAlert} onOpenChange={setShowDirectionsAlert}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Exact Location Unknown</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This building's location is approximate. The directions will guide you to the general vicinity (e.g. village center).
                                            <br/><br/>
                                            Please look around when you arrive.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => {
                                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`, '_blank');
                                        }}>
                                            Get Directions
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </div>
            </div>

            {displayImages.length > 0 ? (
                <div className="space-y-6">
                    {displayImages.map((img) => (
                        <div key={img.id} className="aspect-[4/3] w-full rounded-xl overflow-hidden shadow-lg border border-white/10 relative group">
                            <img
                              src={img.url}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              alt={building.name}
                              onClick={() => setSelectedImage(img)}
                            />
                            {/* Attribution Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-end justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6 border border-white/20">
                                        <AvatarImage src={img.user?.avatar_url || undefined} />
                                        <AvatarFallback className="text-[10px] bg-background/20 text-white border-white/20">{img.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-white drop-shadow-sm">{img.user?.username}</span>
                                        <span className="text-[10px] text-white/80 drop-shadow-sm">{format(new Date(img.created_at), 'MMM yyyy')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-lg border border-white/10 relative group">
                    <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground text-center p-6">
                        <ImageIcon className="w-12 h-12 text-muted-foreground/20 mb-3" />
                        <h3 className="font-medium text-muted-foreground mb-1">No image yet</h3>
                        <p className="text-xs text-muted-foreground/50 max-w-[200px]">Be the first to add a photo of this building</p>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT: Data & Actions */}
        <div className="space-y-8 mt-6 lg:mt-0">
            
            {/* Header Info - Desktop Only */}
            <BuildingHeader building={building} showEditLink={!!user} className="hidden lg:block" />

            {/* ACTION CENTER: Contextual Rating UI [cite: 52] */}
            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                {!isEditing && userStatus ? (
                    // Summary View
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                Your Activity
                            </h3>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to={getBuildingUrl(building.id, building.slug, building.short_id) + "/review"}>
                                    Edit
                                </Link>
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center">
                            {userStatus === 'visited' ? (
                                <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">Visited</Badge>
                            ) : (
                                <Badge variant="secondary">Saved</Badge>
                            )}

                            {myRating > 0 && (
                                <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Circle
                                          key={i}
                                          className={`w-4 h-4 ${i < myRating ? "fill-[#595959] text-[#595959]" : "fill-transparent text-muted-foreground/20"}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {note && <p className="text-sm text-foreground/90">{note}</p>}

                        {tags && tags.length > 0 && (
                             <div className="flex flex-wrap gap-2">
                                {tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                             </div>
                        )}

                        {userImages && userImages.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {userImages.map((img) => {
                                    const publicUrl = getBuildingImageUrl(img.storage_path);
                                    if (!publicUrl) return null;
                                    // Construct partial display image for local user images
                                    const displayImg: DisplayImage = {
                                        id: img.id,
                                        url: publicUrl,
                                        likes_count: 0,
                                        created_at: new Date().toISOString(), // Fallback
                                        user: {
                                            username: profile?.username || user?.email || "Me",
                                            avatar_url: profile?.avatar_url || null
                                        }
                                    };

                                    return (
                                        <img
                                            key={img.id}
                                            src={publicUrl}
                                            className="h-24 w-24 object-cover rounded-md border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                                            alt="Review photo"
                                            onClick={() => setSelectedImage(displayImg)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    // Edit View
                    <>
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
                                {/* Navigation to Write Review */}
                                <Link to={getBuildingUrl(building.id, building.slug, building.short_id) + "/review"}>
                                    <MessageSquarePlus className="w-4 h-4 mr-2" />
                                    {myRating > 0 ? "Edit Review" : "Write Review"}
                                </Link>
                            </Button>
                        </div>

                        {/* Note & Tags Editor */}
                        {showNoteEditor && (
                            <div className="pt-4 border-t border-dashed space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium uppercase text-muted-foreground">Your Note</label>
                                    <Textarea
                                        placeholder="Write a note..."
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
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}

                        {userStatus && (
                            <div className="flex justify-center mt-4 border-t border-dashed pt-4">
                                <Button
                                    variant="link"
                                    className="text-muted-foreground hover:text-destructive h-auto p-0 text-xs"
                                    onClick={() => setShowDeleteAlert(true)}
                                >
                                    Remove from my list
                                </Button>
                            </div>
                        )}
                    </>
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

            {user && (
                <div className="flex justify-end mt-2 mb-2">
                    <Link to={getBuildingUrl(building.id, building.slug, building.short_id) + "/edit"} className="text-xs text-muted-foreground hover:underline">
                        Edit building information
                    </Link>
                </div>
            )}

            {/* Top Community Resources */}
            {(linksLoading || topLinks.length > 0) && (
                <div className="pt-4 border-t border-dashed">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                        Top Community Resources
                    </h3>
                    <div className="space-y-2">
                        {linksLoading ? (
                            <>
                                <Skeleton className="h-12 w-full rounded-lg" />
                                <Skeleton className="h-12 w-full rounded-lg" />
                            </>
                        ) : (
                            topLinks.map(link => {
                                let domain = "";
                                try {
                                    domain = new URL(link.url).hostname;
                                } catch { }
                                const displayDomain = domain || link.url;
                                const hasTitle = !!link.title;

                                return (
                                    <a
                                        key={link.link_id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-border group"
                                    >
                                        <div className="flex flex-col gap-0.5 overflow-hidden">
                                            <span className="font-medium truncate pr-2 text-sm group-hover:text-primary transition-colors">
                                                {hasTitle ? link.title : displayDomain}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {hasTitle && (
                                                    <span className="truncate max-w-[150px]">{displayDomain}</span>
                                                )}
                                                {hasTitle && link.user_username && <span>•</span>}
                                                {link.user_username && (
                                                    <span>shared by @{link.user_username}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {link.like_count > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Heart className="w-3 h-3 fill-muted-foreground/30" />
                                                    <span>{link.like_count}</span>
                                                </div>
                                            )}
                                            <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground" />
                                        </div>
                                    </a>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Find on Web */}
            <div className="pt-4 border-t border-dashed">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Find on Web
                </h3>
                 <a
                    href={googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-border group"
                >
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-background rounded-full border border-border">
                            <Search className="w-4 h-4 text-muted-foreground" />
                         </div>
                         <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm group-hover:text-primary transition-colors">Google Images</span>
                            <span className="text-xs text-muted-foreground">Search for photos of {building.name}</span>
                         </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground" />
                </a>
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
                                        <Link to={`/profile/${entry.user.username || entry.user_id}`} className="font-bold text-sm hover:underline">
                                            {entry.user.username}
                                        </Link>
                                        {entry.status === 'visited' && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">Visited</Badge>}
                                        {entry.status === 'pending' && <Badge variant="outline" className="text-[10px] h-5 px-1.5">Saved</Badge>}
                                        <Link to={`/review/${entry.id}`} className="text-xs text-muted-foreground hover:underline">
                                            {formatDistanceToNow(new Date(entry.created_at))} ago
                                        </Link>
                                    </div>

                                    <Link to={`/review/${entry.id}`} className="block group">
                                        {entry.rating && (
                                            <div className="flex items-center gap-0.5 my-1 group-hover:opacity-80 transition-opacity">
                                                {[...Array(5)].map((_, i) => (
                                                    <Circle
                                                      key={i}
                                                      className={`w-3 h-3 ${i < entry.rating! ? "fill-[#595959] text-[#595959]" : "fill-transparent text-muted-foreground/20"}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        {entry.content && <p className="text-sm mt-1 text-muted-foreground group-hover:text-foreground transition-colors">{entry.content}</p>}
                                    </Link>

                                    {entry.images && entry.images.length > 0 && (
                                        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                                            {entry.images.map((img) => {
                                                const publicUrl = getBuildingImageUrl(img.storage_path);
                                                if (!publicUrl) return null;

                                                const displayImg: DisplayImage = {
                                                    id: img.id,
                                                    url: publicUrl,
                                                    likes_count: 0, // Not available in this view
                                                    created_at: img.created_at || entry.created_at,
                                                    user: entry.user
                                                };

                                                return (
                                                    <img
                                                        key={img.id}
                                                        src={publicUrl}
                                                        className="h-24 w-24 object-cover rounded-md border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                                                        alt="Review photo"
                                                        onClick={() => setSelectedImage(displayImg)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}

                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
      </div>

      <ImageDetailsDialog
        imageId={selectedImage?.id || null}
        initialUrl={selectedImage?.url || null}
        uploadedBy={selectedImage?.user || null}
        uploadDate={selectedImage?.created_at}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Remove from list?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will delete your rating, status, and any notes for this building. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Remove
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
