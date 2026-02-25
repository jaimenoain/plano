import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Loader2, MapPin, Calendar, Send,
  Check, Bookmark, MessageSquarePlus, Image as ImageIcon,
  Heart, ExternalLink, Circle, AlertTriangle, MessageSquare, Search, Play,
  MessageCircle, EyeOff, ImagePlus, Plus, Trash2, Link as LinkIcon, Users, X,
  Pencil
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resizeImage } from "@/lib/image-compression";
import { uploadFile } from "@/utils/upload";
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
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, format } from "date-fns";
import { MetaHead } from "@/components/common/MetaHead";
import { PersonalRatingButton } from "@/components/PersonalRatingButton";
import { UserPicker } from "@/components/common/UserPicker";
import { fetchBuildingDetails, fetchUserBuildingStatus, upsertUserBuilding } from "@/utils/supabaseFallback";
import { parseLocation } from "@/utils/location";
import { getBuildingImageUrl } from "@/utils/image";
import { ImageDetailsDialog } from "@/components/ImageDetailsDialog";
import { Architect } from "@/types/architect";
import { getBuildingUrl } from "@/utils/url";
import { CollectionSelector } from "@/components/profile/CollectionSelector";
import { BuildingAttributes } from "@/components/BuildingAttributes";
import { BuildingLocationMap } from "@/features/maps/components/BuildingLocationMap";
import { PopularityBadge } from "@/components/PopularityBadge";
import { BuildingImageCard } from "@/components/BuildingImageCard";
import { BuildingHeader } from "@/components/BuildingHeader";

// --- Types ---
interface BuildingDetails {
  id: string;
  short_id?: number | null;
  slug?: string | null;
  name: string;
  alt_name?: string | null;
  aliases?: string[] | null;
  tier_rank?: string | null;
  location: any; // PostGIS point handling usually requires parsing
  location_precision?: 'exact' | 'approximate';
  address: string;
  city: string | null;
  country: string | null;
  architects: Architect[];
  year_completed: number;
  styles: { id: string, name: string }[];
  created_by: string;
  status?: string | null;
  access_type?: string | null;
  typology?: string[] | null;
  materials?: string[] | null;
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
    poster?: string;
    type?: 'image' | 'video';
    likes_count: number;
    created_at: string;
    user: {
        username: string | null;
        avatar_url: string | null;
    } | null;
    is_generated?: boolean;
}


export default function BuildingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [building, setBuilding] = useState<BuildingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  
  const canEdit = isCreator || profile?.role === 'admin';

  // User Interaction State
  const [userStatus, setUserStatus] = useState<'visited' | 'pending' | 'ignored' | null>(null);
  const [myRating, setMyRating] = useState<number>(0); // Scale 1-3
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [displayImages, setDisplayImages] = useState<DisplayImage[]>([]);
  const [userImages, setUserImages] = useState<{id: string, storage_path: string, is_generated?: boolean}[]>([]);
  const [selectedImage, setSelectedImage] = useState<DisplayImage | null>(null);
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [socialContext, setSocialContext] = useState<string | null>(null);

  // New State for Edit View Enhancement
  const [userLinks, setUserLinks] = useState<{id: string, url: string, title: string}[]>([]);
  const [pendingImages, setPendingImages] = useState<{id: string, file: File, preview: string, is_generated: boolean}[]>([]);
  const [likedImageIds, setLikedImageIds] = useState<Set<string>>(new Set());
  const [showCollections, setShowCollections] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");

  // Note & Tags
  const [note, setNote] = useState("");
  // const [tags, setTags] = useState<string[]>([]); // Deprecated
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [initialCollectionIds, setInitialCollectionIds] = useState<string[]>([]);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState("");

  // Visit With state
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [showVisitWith, setShowVisitWith] = useState(false);

  // Map state
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showDirectionsAlert, setShowDirectionsAlert] = useState(false);

  // Navigation Logic
  const selectedIndex = useMemo(() => {
    if (!selectedImage) return -1;
    return displayImages.findIndex(img => img.id === selectedImage.id);
  }, [selectedImage, displayImages]);

  const handleNextImage = () => {
    if (selectedIndex < displayImages.length - 1) {
      setSelectedImage(displayImages[selectedIndex + 1]);
    }
  };

  const handlePrevImage = () => {
    if (selectedIndex > 0) {
      setSelectedImage(displayImages[selectedIndex - 1]);
    }
  };

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

      const sanitizedBuilding = {
        ...data,
        architects: (data as any).architects || [],
      };

      setBuilding(sanitizedBuilding as unknown as BuildingDetails);

      if (user && data.created_by === user.id) {
          setIsCreator(true);
      }

      const tasks: Promise<any>[] = [];

      // Task 1: Fetch Top Links (RPC)
      tasks.push(fetchTopLinks(resolvedBuildingId));

      // Task 2: Fetch User Entry (if logged in)
      if (user) {
        tasks.push((async () => {
          const { data: userEntry, error: userEntryError } = await supabase
              .from("user_buildings")
              .select("*, images:review_images(id, storage_path, is_generated)")
              .eq("user_id", user.id)
              .eq("building_id", resolvedBuildingId)
              .maybeSingle();

          // Fetch Collection Items
          const { data: collectionItems } = await supabase
              .from("collection_items")
              .select("collection_id, collections(owner_id)")
              .eq("building_id", resolvedBuildingId);

          const myCollectionIds = collectionItems
              // @ts-ignore
              ?.filter(item => item.collections?.owner_id === user.id)
              .map(item => item.collection_id) || [];

          setSelectedCollectionIds(myCollectionIds);
          setInitialCollectionIds(myCollectionIds);

          if (userEntry) {
              setUserStatus(userEntry.status);
              setMyRating(userEntry.rating || 0);
              setNote(userEntry.content || "");
              // setTags(userEntry.tags || []); // Deprecated
              // @ts-ignore - Supabase types join inference can be tricky
              setUserImages(userEntry.images || []);
              setIsEditing(false);
              if (userEntry.content || (myCollectionIds.length > 0)) {
                  setShowNoteEditor(true);
              }

              if (myCollectionIds.length > 0) {
                  setShowCollections(true);
              }

              // Fetch User Links
              const { data: userLinksData } = await supabase
                .from("review_links")
                .select("id, url, title")
                .eq("review_id", userEntry.id);
              if (userLinksData) setUserLinks(userLinksData);
          } else {
              setIsEditing(true);
              if (userEntryError) {
                  console.error("Error fetching user status:", userEntryError);
              }
          }
        })());
      }

      // Task 3: Fetch Social Feed (Direct Supabase call)
      tasks.push((async () => {
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
            id, user_id, content, rating, status, tags, created_at, video_url,
            user:profiles(username, avatar_url),
            images:review_images(id, storage_path, likes_count, created_at, is_generated)
          `)
          .eq("building_id", resolvedBuildingId)
          .order("created_at", { ascending: false });

        const communityImages: DisplayImage[] = [];

        if (entriesError) {
              console.warn("Error fetching feed:", entriesError);
              // toast({ variant: "destructive", title: "Could not load activity feed" });
        } else if (entriesData) {
            console.log("Fetched feed entries:", entriesData);

            // Determine Social Context
            if (followedIds.size > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const friendEntry = entriesData.find((e: any) => followedIds.has(e.user_id));
                if (friendEntry) {
                     setSocialContext("Saved by contacts");
                }
            }

            // Extract images & video
            entriesData.forEach((entry: any) => {
                // Video
                if (entry.video_url) {
                    // Attempt to find a poster from images or main building
                    let posterUrl: string | undefined = undefined;
                    if (entry.images && entry.images.length > 0) {
                        posterUrl = getBuildingImageUrl(entry.images[0].storage_path) || undefined;
                    }

                    communityImages.push({
                        id: `video-${entry.id}`,
                        url: entry.video_url,
                        poster: posterUrl,
                        type: 'video',
                        likes_count: 0, // Videos typically share likes with the review, which isn't separately tracked per image currently in this view
                        created_at: entry.created_at,
                        user: entry.user
                    });
                }

                // Images
                if (entry.images && entry.images.length > 0) {
                    entry.images.forEach((img: any) => {
                          const publicUrl = getBuildingImageUrl(img.storage_path);
                          if (publicUrl) {
                              communityImages.push({
                                  id: img.id,
                                  url: publicUrl,
                                  type: 'image',
                                  likes_count: img.likes_count || 0,
                                  created_at: img.created_at || entry.created_at,
                                  user: entry.user,
                                  is_generated: img.is_generated
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

        // Fetch user likes for these images
        if (user && communityImages.length > 0) {
            const imageIds = communityImages
                .filter(img => img.type === 'image')
                .map(img => img.id);

            if (imageIds.length > 0) {
                const { data: likesData } = await supabase
                    .from("image_likes")
                    .select("image_id")
                    .eq("user_id", user.id)
                    .in("image_id", imageIds);

                const likedSet = new Set(likesData?.map(l => l.image_id) || []);
                setLikedImageIds(likedSet);
            }
        }

        // Combine with main image
        setDisplayImages(communityImages);
      })());

      await Promise.all(tasks);
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

  const handleStatusChange = async (newStatus: 'visited' | 'pending' | 'ignored') => {
      if (!user || !building) return;

      // Check if user is toggling off the current status
      if (userStatus === newStatus) {
          const parts = [];
          if (note) parts.push("your review");
          if (selectedCollectionIds.length > 0) parts.push(`associations with ${selectedCollectionIds.length} collections`);
          if (userImages.length > 0) parts.push(`your ${userImages.length} saved photos/videos`);

          let msg = "You are about to remove this building from your profile.";
          if (parts.length > 0) {
              const last = parts.pop();
              const list = parts.length > 0 ? parts.join(", ") + " and " + last : last;
              msg += ` This will permanently delete ${list}.`;
          } else {
              msg += " This action cannot be undone.";
          }

          setDeleteWarningMessage(msg);
          setShowDeleteAlert(true);
          return;
      }

      if (newStatus !== 'ignored') {
        setShowNoteEditor(true);
      }
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

          const title = newStatus === 'visited' ? "Marked as Visited"
            : newStatus === 'ignored' ? "Building Hidden"
            : "Added to Pending";

          queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
          queryClient.invalidateQueries({ queryKey: ["map-clusters"] });

          toast({ title });
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

           queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
           queryClient.invalidateQueries({ queryKey: ["map-clusters"] });

           if (rating >= 2) {
               toast({ title: "You just boosted this building's rank!", description: "Thanks for your feedback." });
           } else {
               toast({ title: "Rating saved" });
           }
       } catch (error) {
           console.error("Rating failed", error);
           toast({ variant: "destructive", title: "Failed to save rating" });
           fetchBuildingData();
       }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          const compressedFile = await resizeImage(file);
          const previewUrl = URL.createObjectURL(compressedFile);
          setPendingImages(prev => [...prev, {
            id: crypto.randomUUID(),
            file: compressedFile,
            preview: previewUrl,
            is_generated: false
          }]);
        } catch (error) {
          console.error("Error processing image", error);
          toast({ variant: "destructive", title: "Error processing image" });
        }
      }
      e.target.value = ""; // Reset input
    }
  };

  const removePendingImage = (id: string) => {
    setPendingImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return newImages;
    });
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    try {
        new URL(url);
    } catch {
        toast({ variant: "destructive", title: "Invalid URL" });
        return;
    }

    setUserLinks(prev => [...prev, {
        id: crypto.randomUUID(),
        url,
        title: newLinkTitle
    }]);
    setNewLinkUrl("");
    setNewLinkTitle("");
  };

  const handleRemoveLink = (id: string) => {
      setUserLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleSaveNote = async () => {
      if (!user || !building) return;
      setIsSavingNote(true);

      const statusToUse = userStatus || 'visited';
      if (!userStatus) setUserStatus('visited');

      try {
          const { data: savedEntry, error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: building.id,
              status: statusToUse,
              rating: myRating > 0 ? myRating : null,
              content: note,
              // tags: tags, // Deprecated
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' })
          .select()
          .single();

          if (error) throw error;

          const reviewId = savedEntry.id;

          // Sync Collections
          const addedIds = selectedCollectionIds.filter(id => !initialCollectionIds.includes(id));
          const removedIds = initialCollectionIds.filter(id => !selectedCollectionIds.includes(id));

          if (addedIds.length > 0) {
              const { error: addError } = await supabase
                  .from("collection_items")
                  .insert(addedIds.map(cId => ({
                      collection_id: cId,
                      building_id: building.id
                  })));
              if (addError) console.error("Error adding to collections", addError);
          }

          if (removedIds.length > 0) {
              const { error: removeError } = await supabase
                  .from("collection_items")
                  .delete()
                  .in("collection_id", removedIds)
                  .eq("building_id", building.id);
              if (removeError) console.error("Error removing from collections", removeError);
          }

          setInitialCollectionIds(selectedCollectionIds);

          // Sync Links (Delete all and re-insert strategy)
          if (reviewId) {
             await supabase.from("review_links").delete().eq("review_id", reviewId);
             if (userLinks.length > 0) {
                 await supabase.from("review_links").insert(
                     userLinks.map(l => ({
                         review_id: reviewId,
                         user_id: user.id,
                         url: l.url,
                         title: l.title
                     }))
                 );
             }
          }

          // Sync Images (Upload pending)
          if (pendingImages.length > 0 && reviewId) {
              for (const img of pendingImages) {
                  const storagePath = await uploadFile(img.file, reviewId);
                  await supabase.from("review_images").insert({
                      review_id: reviewId,
                      user_id: user.id,
                      storage_path: storagePath,
                      is_generated: img.is_generated
                  });
              }
              // Clear pending images
              pendingImages.forEach(img => URL.revokeObjectURL(img.preview));
              setPendingImages([]);
          }

          toast({ title: "Review saved" });
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
          queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
          fetchBuildingData();
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

          // Remove from collections
          if (initialCollectionIds.length > 0) {
              await supabase
                  .from("collection_items")
                  .delete()
                  .in("collection_id", initialCollectionIds)
                  .eq("building_id", building.id);
          }

          setUserStatus(null);
          setMyRating(0);
          setNote("");
          // setTags([]);
          setSelectedCollectionIds([]);
          setInitialCollectionIds([]);
          setIsEditing(false);

          queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
          queryClient.invalidateQueries({ queryKey: ["map-clusters"] });

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

      <BuildingAttributes
        accessType={building.access_type}
        className="lg:hidden px-4 mt-4 mb-2"
      />

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 max-w-7xl mx-auto p-4 lg:p-8 pt-4">
        
        {/* LEFT: Visuals & Map (Map-First Experience ) */}
        <div className="space-y-6">
            <div className="space-y-2 group">
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
                  <BuildingLocationMap
                    lat={coordinates.lat}
                    lng={coordinates.lng}
                    status={userStatus}
                    rating={myRating}
                    tierRank={building.tier_rank}
                    locationPrecision={building.location_precision}
                    isExpanded={isMapExpanded}
                    onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                    className={isMapExpanded ? "" : "h-48 w-full"}
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
                        {user && (
                            <Link
                                to={getBuildingUrl(building.id, building.slug, building.short_id) + "/edit"}
                                className="hidden group-hover:inline-flex items-center justify-center p-1 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors ml-1"
                                title="Edit building"
                            >
                                <Pencil className="w-3 h-3" />
                            </Link>
                        )}
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

                {(building.status === 'Demolished' || building.status === 'Unbuilt' || building.status === 'Under Construction') && (
                    <Alert className="mt-4 border-destructive/50 bg-destructive/10 text-destructive dark:text-red-400">
                        <AlertTriangle className="h-4 w-4 stroke-destructive dark:stroke-red-400" />
                        <AlertDescription className="ml-2 font-medium">
                            {building.status === 'Demolished'
                                ? "This building has been demolished."
                                : building.status === 'Unbuilt'
                                ? "This project was never built."
                                : "This building is under construction."}
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {displayImages.length > 0 ? (
                <div className="space-y-6">
                    {displayImages.map((img) => (
                        <BuildingImageCard
                            key={img.id}
                            image={img}
                            initialIsLiked={likedImageIds.has(img.id)}
                            onOpen={() => setSelectedImage(img)}
                        />
                    ))}
                </div>
            ) : (
                <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-lg border border-white/10 relative group">
                    <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground text-center p-6">
                        <ImageIcon className="w-12 h-12 text-muted-foreground/20 mb-3" />
                        <h3 className="font-medium text-muted-foreground mb-1">No image yet</h3>
                        <p className="text-xs text-muted-foreground/50 max-w-[200px] mb-4">Be the first to add a photo of this building</p>
                        <Button variant="outline" size="sm" asChild>
                            <Link to={getBuildingUrl(building.id, building.slug, building.short_id) + "/review"}>
                                <ImagePlus className="w-4 h-4 mr-2" />
                                Upload photo
                            </Link>
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex justify-center pt-2">
                 <a
                    href={googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
                >
                    <Search className="w-3 h-3" />
                    Search for photos on Google
                    <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
            </div>
        </div>

        {/* RIGHT: Data & Actions */}
        <div className="space-y-8 mt-6 lg:mt-0">
            
            {/* Header Info - Desktop Only */}
      <BuildingHeader building={building} showEditLink={!!user} className="hidden lg:block" />

            <BuildingAttributes
                accessType={building.access_type}
                className="hidden lg:grid mt-6"
            />

            {/* ACTION CENTER: Contextual Rating UI [cite: 52] */}
            <div className="space-y-6">
                {!isEditing && userStatus ? (
                    // Summary View
                    <div className="bg-white rounded-2xl p-5 border border-transparent space-y-4">
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
                                <Badge
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                                    onClick={() => handleStatusChange('pending')}
                                >
                                    Visited
                                </Badge>
                            ) : userStatus === 'ignored' ? (
                                <Badge variant="outline" className="text-muted-foreground border-dashed">Hidden</Badge>
                            ) : (
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-secondary/80"
                                    onClick={() => handleStatusChange('visited')}
                                >
                                    Saved
                                </Badge>
                            )}

                            {myRating > 0 && (
                                <div className="flex items-center gap-0.5">
                                    {[...Array(3)].map((_, i) => (
                                        <Circle
                                          key={i}
                                          className={`w-4 h-4 ${i < myRating ? "fill-[#595959] text-[#595959]" : "fill-transparent text-muted-foreground/20"}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {note && <p className="text-sm text-foreground/90">{note}</p>}

                        {selectedCollectionIds.length > 0 && (
                             <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs border-dashed">
                                    In {selectedCollectionIds.length} Collection{selectedCollectionIds.length > 1 ? 's' : ''}
                                </Badge>
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
                                        },
                                        is_generated: img.is_generated
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
                        <div className="flex flex-col gap-4">
                            {/* Toggle Status */}
                            <div className="flex items-center gap-2 w-full py-4 border-y border-dashed border-border/60">
                                {userStatus && (
                                    <Button
                                        variant="link"
                                        className="text-muted-foreground hover:text-destructive h-auto p-0 text-xs shrink-0"
                                        onClick={() => setShowDeleteAlert(true)}
                                    >
                                        Remove from my list
                                    </Button>
                                )}
                                <Button
                                    variant={userStatus === 'pending' ? "default" : "secondary"}
                                    size="sm"
                                    className="flex-1 rounded-full h-10 shadow-none hover:bg-muted-foreground/10 data-[state=active]:bg-primary"
                                    onClick={() => handleStatusChange('pending')}
                                >
                                    <Bookmark className={`w-4 h-4 mr-2 ${userStatus === 'pending' ? "fill-current" : ""}`} />
                                    {userStatus === 'pending' ? "Saved" : "Save"}
                                </Button>
                                <Button
                                    variant={userStatus === 'visited' ? "default" : "secondary"}
                                    size="sm"
                                    className="flex-1 rounded-full h-10 shadow-none hover:bg-muted-foreground/10"
                                    onClick={() => handleStatusChange('visited')}
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Visited
                                </Button>
                                <Button
                                    variant={userStatus === 'ignored' ? "default" : "secondary"}
                                    size="sm"
                                    className="flex-1 rounded-full h-10 shadow-none hover:bg-muted-foreground/10"
                                    onClick={() => handleStatusChange('ignored')}
                                >
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Hide
                                </Button>
                            </div>

                            <div className="flex justify-center pt-2">
                                {(userStatus === 'visited' || userStatus === 'pending') && (
                                    <PersonalRatingButton
                                        buildingId={building.id}
                                        initialRating={myRating}
                                        onRate={handleRate}
                                        status={userStatus || 'visited'}
                                        label={userStatus === 'pending' ? "Priority" : "Add points (optional)"}
                                        variant="inline"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Note & Tags Editor */}
                        {showNoteEditor && (userStatus === 'visited' || userStatus === 'pending') && (
                            <div className="pt-4 border-t border-dashed space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium uppercase text-muted-foreground">Your Note</label>
                                    <Textarea
                                        placeholder="Write a note..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="resize-none"
                                    />
                                </div>

                                {/* Action Buttons Row */}
                                <div className="flex flex-wrap gap-2">
                                     <Button
                                        variant={pendingImages.length > 0 ? "secondary" : "outline"}
                                        size="sm"
                                        className="gap-2 text-xs h-8"
                                        onClick={() => document.getElementById('hidden-file-input')?.click()}
                                     >
                                        <ImagePlus className="w-3 h-3" />
                                        Add media
                                     </Button>
                                     <input
                                        id="hidden-file-input"
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageSelect}
                                     />

                                     <Button
                                        variant={showCollections || selectedCollectionIds.length > 0 ? "secondary" : "outline"}
                                        size="sm"
                                        className="gap-2 text-xs h-8"
                                        onClick={() => setShowCollections(!showCollections)}
                                     >
                                        <Plus className="w-3 h-3" />
                                        Add to collection
                                     </Button>

                                     <Button
                                        variant={showLinkEditor || userLinks.length > 0 ? "secondary" : "outline"}
                                        size="sm"
                                        className="gap-2 text-xs h-8"
                                        onClick={() => setShowLinkEditor(!showLinkEditor)}
                                     >
                                        <LinkIcon className="w-3 h-3" />
                                        Add link
                                     </Button>
                                </div>

                                {/* Media Section */}
                                {pendingImages.length > 0 && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-1">
                                        {pendingImages.map((img) => (
                                            <div key={img.id} className="relative aspect-square group rounded-md overflow-hidden border bg-muted">
                                                <img src={img.preview} className="w-full h-full object-cover" alt="Preview" />

                                                <button
                                                    onClick={() => setPendingImages(prev => prev.map(p => p.id === img.id ? { ...p, is_generated: !p.is_generated } : p))}
                                                    className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors z-10 ${img.is_generated ? 'bg-primary text-primary-foreground' : 'bg-black/60 text-white hover:bg-black/80'}`}
                                                >
                                                    {img.is_generated ? 'Render' : 'Photo'}
                                                </button>

                                                <button
                                                    onClick={() => removePendingImage(img.id)}
                                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Collections Section */}
                                {showCollections && (
                                    <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                                         <CollectionSelector
                                            userId={user.id}
                                            selectedCollectionIds={selectedCollectionIds}
                                            onChange={setSelectedCollectionIds}
                                        />
                                    </div>
                                )}

                                {/* Links Section */}
                                {(showLinkEditor || userLinks.length > 0) && (
                                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1">
                                         {userLinks.length > 0 && (
                                             <div className="space-y-2">
                                                 {userLinks.map(link => (
                                                     <div key={link.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border text-sm">
                                                         <div className="flex flex-col overflow-hidden">
                                                             <span className="font-medium truncate">{link.title || link.url}</span>
                                                             <span className="text-xs text-muted-foreground truncate opacity-70">{link.url}</span>
                                                         </div>
                                                         <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleRemoveLink(link.id)}
                                                         >
                                                            <Trash2 className="w-3 h-3" />
                                                         </Button>
                                                     </div>
                                                 ))}
                                             </div>
                                         )}

                                         {showLinkEditor && (
                                             <div className="flex flex-col gap-2 p-3 bg-muted/20 rounded-md border border-dashed">
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                     <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase text-muted-foreground">URL</Label>
                                                        <Input
                                                            value={newLinkUrl}
                                                            onChange={e => setNewLinkUrl(e.target.value)}
                                                            placeholder="https://..."
                                                            className="h-8 text-xs"
                                                        />
                                                     </div>
                                                     <div className="space-y-1">
                                                        <Label className="text-[10px] uppercase text-muted-foreground">Title</Label>
                                                        <Input
                                                            value={newLinkTitle}
                                                            onChange={e => setNewLinkTitle(e.target.value)}
                                                            placeholder="Optional title"
                                                            className="h-8 text-xs"
                                                        />
                                                     </div>
                                                 </div>
                                                 <Button size="sm" variant="secondary" onClick={handleAddLink} className="self-end h-7 text-xs">
                                                     Add Link
                                                 </Button>
                                             </div>
                                         )}
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button size="sm" onClick={handleSaveNote} disabled={isSavingNote}>
                                        {isSavingNote && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}

                    </>
                )}

                {/* Visit With Feature - Only visible when status is 'pending' */}
                {userStatus === 'pending' && (
                    <div className="pt-4 border-t border-dashed">
                        {!showVisitWith ? (
                            <Button
                                variant="outline"
                                className="w-full justify-start text-muted-foreground hover:text-foreground"
                                onClick={() => setShowVisitWith(true)}
                            >
                                <span className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Visit with...
                                </span>
                            </Button>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Visit with...</label>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowVisitWith(false)}>
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>

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
                                <p className="text-xs text-muted-foreground">
                                    Invite friends to join you. They'll get a notification.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>


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
                                                {[...Array(3)].map((_, i) => (
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
        type={selectedImage?.type || 'image'}
        uploadedBy={selectedImage?.user || null}
        uploadDate={selectedImage?.created_at}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        onNext={handleNextImage}
        onPrev={handlePrevImage}
        hasNext={selectedIndex < displayImages.length - 1}
        hasPrev={selectedIndex > 0}
        isGenerated={selectedImage?.is_generated}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Remove from list?</AlertDialogTitle>
                  <AlertDialogDescription>
                      {deleteWarningMessage || "This will delete your rating, status, and any notes for this building. This action cannot be undone."}
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
