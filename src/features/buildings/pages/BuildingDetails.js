import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, MapPin, Send, Check, Bookmark, Image as ImageIcon, Heart, ExternalLink, Circle, AlertTriangle, Search, EyeOff, ImagePlus, Plus, Trash2, Link as LinkIcon, Users, X, Pencil, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resizeImage } from "@/lib/image-compression";
import { uploadFile } from "@/utils/upload";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { MetaHead } from "@/components/common/MetaHead";
import { WidgetErrorBoundary } from "@/components/common/WidgetErrorBoundary";
import { PersonalRatingButton } from "../components/PersonalRatingButton";
import { UserPicker } from "@/components/common/UserPicker";
import { fetchBuildingDetails } from "@/utils/supabaseFallback";
import { parseLocation } from "@/utils/location";
import { getBuildingImageUrl } from "@/utils/image";
import { ImageDetailsDialog } from "../components/ImageDetailsDialog";
import { getBuildingUrl } from "@/utils/url";
import { CollectionSelector } from "@/features/collections/components/CollectionSelector";
import { BuildingLocationMap } from "@/features/maps/components/BuildingLocationMap";
import { BuildingImageCard } from "../components/BuildingImageCard";
import { BuildingHeader } from "../components/BuildingHeader";
import { ArchitectStatement } from "../components/ArchitectStatement";
import { BuildingHero } from "../components/BuildingHero";
import { BuildingAttributes } from "../components/BuildingAttributes";
export default function BuildingDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [building, setBuilding] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreator, setIsCreator] = useState(false);
    // User Interaction State
    const [userStatus, setUserStatus] = useState(null);
    const [myRating, setMyRating] = useState(0); // Scale 1-3
    const [hoverRating, setHoverRating] = useState(null);
    const [entries, setEntries] = useState([]);
    const [displayImages, setDisplayImages] = useState([]);
    const [userImages, setUserImages] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [topLinks, setTopLinks] = useState([]);
    const [likedLinkIds, setLikedLinkIds] = useState(new Set());
    const [linksLoading, setLinksLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [_socialContext, setSocialContext] = useState(null);
    // Official Data Editing State
    const [isOfficialEditing, setIsOfficialEditing] = useState(false);
    const [verifiedClaims, setVerifiedClaims] = useState([]);
    const [hasVerifiedArchitect, setHasVerifiedArchitect] = useState(false);
    const isVerifiedArchitect = useMemo(() => {
        if (!building?.architects || verifiedClaims.length === 0)
            return false;
        return building.architects.some(a => verifiedClaims.includes(a.id));
    }, [building, verifiedClaims]);
    const canEditOfficialData = profile?.role === 'admin' || isVerifiedArchitect || (isCreator && !hasVerifiedArchitect);
    const [draftOfficialData, setDraftOfficialData] = useState({
        name: "",
        year_completed: 0,
        city: "",
        country: "",
        architect_statement: ""
    });
    const [isSavingOfficial, setIsSavingOfficial] = useState(false);
    const [heroImageUrl, setHeroImageUrl] = useState(null);
    // New State for Edit View Enhancement
    const [userLinks, setUserLinks] = useState([]);
    const [pendingImages, setPendingImages] = useState([]);
    const [likedImageIds, setLikedImageIds] = useState(new Set());
    const [showCollections, setShowCollections] = useState(false);
    const [showLinkEditor, setShowLinkEditor] = useState(false);
    const [newLinkUrl, setNewLinkUrl] = useState("");
    const [newLinkTitle, setNewLinkTitle] = useState("");
    // Note & Tags
    const [note, setNote] = useState("");
    // const [tags, setTags] = useState<string[]>([]); // Deprecated
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [initialCollectionIds, setInitialCollectionIds] = useState([]);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [deleteWarningMessage, setDeleteWarningMessage] = useState("");
    // Visit With state
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [sendingInvites, setSendingInvites] = useState(false);
    const [showVisitWith, setShowVisitWith] = useState(false);
    // Map state
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [showDirectionsAlert, setShowDirectionsAlert] = useState(false);
    // Navigation Logic
    const selectedIndex = useMemo(() => {
        if (!selectedImage)
            return -1;
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
        if (building) {
            setDraftOfficialData({
                name: building.name,
                year_completed: building.year_completed,
                city: building.city || "",
                country: building.country || "",
                architect_statement: building.architect_statement || ""
            });
        }
    }, [building]);
    useEffect(() => {
        const handleKeyDown = (event) => {
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
        if (id)
            fetchBuildingData();
    }, [id, user]);
    const fetchBuildingData = async () => {
        setLoading(true);
        if (!id)
            return;
        try {
            // 1. Fetch Building (with fallback logic in utility)
            const data = await fetchBuildingDetails(id);
            const resolvedBuildingId = data.id;
            const sanitizedBuilding = {
                ...data,
                architects: data.architects || [],
            };
            setBuilding(sanitizedBuilding);
            if (data.hero_image_id) {
                const { data: heroImageData } = await supabase
                    .from("review_images")
                    .select("storage_path")
                    .eq("id", data.hero_image_id)
                    .single();
                if (heroImageData) {
                    setHeroImageUrl(getBuildingImageUrl(heroImageData.storage_path) ?? null);
                }
            }
            if (user && data.created_by === user.id) {
                setIsCreator(true);
            }
            const tasks = [];
            // Check if ANY architect of this building has been verified globally
            if (sanitizedBuilding.architects && sanitizedBuilding.architects.length > 0) {
                tasks.push((async () => {
                    const architectIds = sanitizedBuilding.architects.map((a) => a.id);
                    const { data: verifiedProfiles } = await supabase
                        .from('profiles')
                        .select('id')
                        .in('verified_architect_id', architectIds)
                        .limit(1);
                    if (verifiedProfiles && verifiedProfiles.length > 0) {
                        setHasVerifiedArchitect(true);
                    }
                    else {
                        setHasVerifiedArchitect(false);
                    }
                })());
            }
            // Task 1: Fetch Top Links (RPC)
            tasks.push(fetchTopLinks(resolvedBuildingId));
            // Task 2: Fetch User Entry (if logged in)
            if (user) {
                tasks.push((async () => {
                    // Fetch architect claims
                    const { data: claims } = await supabase.from('architect_claims')
                        .select('architect_id')
                        .eq('user_id', user.id)
                        .eq('status', 'verified');
                    if (claims)
                        setVerifiedClaims(claims.map(c => c.architect_id));
                    const { data: userEntry, error: _userEntryError } = await supabase
                        .from("user_buildings")
                        .select("*, images:review_images(id, storage_path, is_generated, is_official)")
                        .eq("user_id", user.id)
                        .eq("building_id", resolvedBuildingId)
                        .maybeSingle();
                    // Fetch Collection Items
                    const { data: collectionItems } = await supabase
                        .from("collection_items")
                        .select("collection_id, collections(owner_id)")
                        .eq("building_id", resolvedBuildingId);
                    const myCollectionIds = collectionItems
                        // @ts-expect-error -- legacy Supabase row typing
                        ?.filter(item => item.collections?.owner_id === user.id)
                        .map(item => item.collection_id) || [];
                    setSelectedCollectionIds(myCollectionIds);
                    setInitialCollectionIds(myCollectionIds);
                    if (userEntry) {
                        setUserStatus(userEntry.status);
                        setMyRating(userEntry.rating || 0);
                        setNote(userEntry.content || "");
                        // setTags(userEntry.tags || []); // Deprecated
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
                        if (userLinksData)
                            setUserLinks(userLinksData);
                    }
                    else {
                        setIsEditing(true);
                    }
                })());
            }
            // Task 3: Fetch Social Feed (Direct Supabase call)
            tasks.push((async () => {
                // Fetch follows for prioritization
                let followedIds = new Set();
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
                    .rpc("get_building_reviews", { p_building_id: resolvedBuildingId });
                const communityImages = [];
                if (entriesError) {
                    // toast({ variant: "destructive", title: "Could not load activity feed" });
                }
                else if (entriesData) {
                    const rawEntries = entriesData;
                    // Determine Social Context
                    if (followedIds.size > 0) {
                        const friendEntry = rawEntries.find((e) => followedIds.has(e.user_id));
                        if (friendEntry) {
                            setSocialContext("Saved by contacts");
                        }
                    }
                    // Extract images & video
                    rawEntries.forEach((entry) => {
                        // Video
                        if (entry.video_url) {
                            // Attempt to find a poster from images or main building
                            let posterUrl = undefined;
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
                                user: entry.user_data // Use user_data from RPC
                            });
                        }
                        // Images
                        if (entry.images && entry.images.length > 0) {
                            entry.images.forEach((img) => {
                                const publicUrl = getBuildingImageUrl(img.storage_path);
                                if (publicUrl) {
                                    communityImages.push({
                                        id: img.id,
                                        url: publicUrl,
                                        type: 'image',
                                        likes_count: img.likes_count || 0,
                                        created_at: img.created_at || entry.created_at,
                                        user: entry.user_data, // Use user_data from RPC
                                        is_generated: img.is_generated,
                                        is_official: img.is_official
                                    });
                                }
                            });
                        }
                    });
                    // Sort images
                    communityImages.sort((a, b) => {
                        if (b.likes_count !== a.likes_count)
                            return b.likes_count - a.likes_count;
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    });
                    // Sanitize entries
                    const sanitizedEntries = rawEntries.map((e) => ({
                        id: e.id,
                        user_id: e.user_id,
                        content: e.content ?? null,
                        rating: e.rating ?? null,
                        status: e.status ?? "visited",
                        tags: e.tags ?? null,
                        created_at: e.created_at,
                        user: {
                            username: e.user_data?.username ?? null,
                            avatar_url: e.user_data?.avatar_url ?? null,
                            is_verified_architect: e.user_data?.is_verified_architect,
                            is_architect_of_building: e.user_data?.is_architect_of_building,
                        },
                        images: (e.images || []).map((img) => ({
                            id: img.id,
                            storage_path: img.storage_path,
                            created_at: img.created_at,
                        })),
                    }));
                    // Sort entries: Followed users first, then by date (recency)
                    sanitizedEntries.sort((a, b) => {
                        const aIsFollowed = followedIds.has(a.user_id);
                        const bIsFollowed = followedIds.has(b.user_id);
                        if (aIsFollowed && !bIsFollowed)
                            return -1;
                        if (!aIsFollowed && bIsFollowed)
                            return 1;
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
                        const likedSet = new Set(likesData?.map((l) => l.image_id) || []);
                        setLikedImageIds(likedSet);
                    }
                }
                // Combine with main image
                setDisplayImages(communityImages);
            })());
            await Promise.all(tasks);
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Error", description: "Building not found" });
        }
        finally {
            setLoading(false);
        }
    };
    const fetchTopLinks = async (buildingId) => {
        setLinksLoading(true);
        const { data: linksData, error: linksError } = await supabase
            .rpc('get_building_top_links', {
            p_building_id: buildingId
        });
        if (!linksError && linksData) {
            setTopLinks(linksData);
            if (user && linksData.length > 0) {
                const linkIds = linksData.map((l) => l.link_id);
                const { data: likes } = await supabase
                    .from('link_likes')
                    .select('link_id')
                    .eq('user_id', user.id)
                    .in('link_id', linkIds);
                if (likes) {
                    setLikedLinkIds(new Set(likes.map(l => l.link_id)));
                }
            }
        }
        setLinksLoading(false);
    };
    const handleLinkLike = async (linkId) => {
        if (!user) {
            toast({ title: "Please sign in to like links" });
            return;
        }
        const isLiked = likedLinkIds.has(linkId);
        const newLiked = new Set(likedLinkIds);
        if (isLiked) {
            newLiked.delete(linkId);
        }
        else {
            newLiked.add(linkId);
        }
        setLikedLinkIds(newLiked);
        setTopLinks(prev => prev.map(l => {
            if (l.link_id === linkId) {
                return { ...l, like_count: l.like_count + (isLiked ? -1 : 1) };
            }
            return l;
        }));
        try {
            if (isLiked) {
                await supabase.from("link_likes").delete().eq("link_id", linkId).eq("user_id", user.id);
            }
            else {
                await supabase.from("link_likes").insert({ link_id: linkId, user_id: user.id });
            }
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to like link" });
            // Revert
            setLikedLinkIds(likedLinkIds);
            setTopLinks(prev => prev.map(l => {
                if (l.link_id === linkId) {
                    return { ...l, like_count: l.like_count + (isLiked ? 1 : -1) };
                }
                return l;
            }));
        }
    };
    const handleStatusChange = async (newStatus) => {
        if (!user || !building)
            return;
        // Check if user is toggling off the current status
        if (userStatus === newStatus) {
            const parts = [];
            if (note)
                parts.push("your review");
            if (selectedCollectionIds.length > 0)
                parts.push(`associations with ${selectedCollectionIds.length} collections`);
            if (userImages.length > 0)
                parts.push(`your ${userImages.length} saved photos/videos`);
            let msg = "You are about to remove this building from your profile.";
            if (parts.length > 0) {
                const last = parts.pop();
                const list = parts.length > 0 ? parts.join(", ") + " and " + last : last;
                msg += ` This will permanently delete ${list}.`;
            }
            else {
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
            if (error)
                throw error;
            const title = newStatus === 'visited' ? "Marked as Visited"
                : newStatus === 'ignored' ? "Building Hidden"
                    : "Added to Pending";
            queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
            queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
            toast({ title });
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to save status" });
            fetchBuildingData(); // Revert
        }
    };
    const handleRate = async (_buildingId, rating) => {
        if (!user || !building)
            return;
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
                rating: rating > 0 ? rating : null,
                edited_at: new Date().toISOString()
            }, { onConflict: 'user_id, building_id' });
            if (error)
                throw error;
            queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
            queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
            if (rating >= 2) {
                toast({ title: "You just boosted this building's rank!", description: "Thanks for your feedback." });
            }
            else {
                toast({ title: "Rating saved" });
            }
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to save rating" });
            fetchBuildingData();
        }
    };
    const handleImageSelect = async (e) => {
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
                }
                catch (_error) {
                    toast({ variant: "destructive", title: "Error processing image" });
                }
            }
            e.target.value = ""; // Reset input
        }
    };
    const removePendingImage = (id) => {
        setPendingImages(prev => {
            const newImages = prev.filter(img => img.id !== id);
            const removed = prev.find(img => img.id === id);
            if (removed)
                URL.revokeObjectURL(removed.preview);
            return newImages;
        });
    };
    const handleAddLink = () => {
        if (!newLinkUrl.trim())
            return;
        let url = newLinkUrl.trim();
        if (!/^https?:\/\//i.test(url))
            url = "https://" + url;
        try {
            new URL(url);
        }
        catch {
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
    const handleRemoveLink = (id) => {
        setUserLinks(prev => prev.filter(l => l.id !== id));
    };
    const handleSaveNote = async () => {
        if (!user || !building)
            return;
        setIsSavingNote(true);
        const statusToUse = userStatus || 'visited';
        if (!userStatus)
            setUserStatus('visited');
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
            if (error)
                throw error;
            const reviewId = savedEntry.id;
            // Sync Collections
            const addedIds = selectedCollectionIds.filter(id => !initialCollectionIds.includes(id));
            const removedIds = initialCollectionIds.filter(id => !selectedCollectionIds.includes(id));
            if (addedIds.length > 0) {
                const { error: _addError } = await supabase
                    .from("collection_items")
                    .insert(addedIds.map(cId => ({
                    collection_id: cId,
                    building_id: building.id
                })));
            }
            if (removedIds.length > 0) {
                const { error: _removeError } = await supabase
                    .from("collection_items")
                    .delete()
                    .in("collection_id", removedIds)
                    .eq("building_id", building.id);
            }
            setInitialCollectionIds(selectedCollectionIds);
            // Sync Links (Delete all and re-insert strategy)
            if (reviewId) {
                await supabase.from("review_links").delete().eq("review_id", reviewId);
                if (userLinks.length > 0) {
                    await supabase.from("review_links").insert(userLinks.map(l => ({
                        review_id: reviewId,
                        user_id: user.id,
                        url: l.url,
                        title: l.title
                    })));
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
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to save note" });
        }
        finally {
            setIsSavingNote(false);
        }
    };
    const handleDelete = async () => {
        if (!user || !building)
            return;
        try {
            const { error } = await supabase
                .from("user_buildings")
                .delete()
                .eq("user_id", user.id)
                .eq("building_id", building.id);
            if (error)
                throw error;
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
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to remove" });
        }
    };
    const handleSendInvites = async () => {
        if (!user || !building || selectedFriends.length === 0)
            return;
        setSendingInvites(true);
        try {
            const status = "visit_with";
            const { error: recError } = await supabase
                .from("recommendations")
                .insert(selectedFriends.map(recipientId => ({
                recommender_id: user.id,
                recipient_id: recipientId,
                building_id: building.id,
                status: status
            })));
            if (recError)
                throw recError;
            toast({ title: "Invites sent!", description: `Sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}.` });
            setSelectedFriends([]);
        }
        catch (error) {
            toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to send invites." });
        }
        finally {
            setSendingInvites(false);
        }
    };
    const handleSaveOfficialData = async () => {
        if (!building)
            return;
        setIsSavingOfficial(true);
        try {
            const { error } = await supabase
                .from('buildings')
                .update({
                name: draftOfficialData.name,
                year_completed: draftOfficialData.year_completed,
                city: draftOfficialData.city,
                country: draftOfficialData.country,
                architect_statement: draftOfficialData.architect_statement
            })
                .eq('id', building.id);
            if (error)
                throw error;
            toast({ title: "Building updated successfully" });
            setIsOfficialEditing(false);
            fetchBuildingData();
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to update building" });
        }
        finally {
            setIsSavingOfficial(false);
        }
    };
    const handleSetHeroImage = async () => {
        if (!selectedImage || !building)
            return;
        const newHeroId = selectedImage.id;
        const newHeroUrl = selectedImage.url;
        // Optimistic Update
        setHeroImageUrl(newHeroUrl);
        setBuilding(prev => prev ? { ...prev, hero_image_id: newHeroId } : null);
        try {
            const { error } = await supabase
                .from('buildings')
                .update({ hero_image_id: newHeroId })
                .eq('id', building.id);
            if (error)
                throw error;
            toast({ title: "Hero image updated" });
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to set hero image" });
            // Revert is handled by fetchBuildingData refetch or just simple error message,
            // strict revert would require storing previous state but image transition covers visual glitch
        }
    };
    const handleToggleOfficial = async () => {
        if (!selectedImage)
            return;
        const newStatus = !selectedImage.is_official;
        // Optimistic Update
        setSelectedImage(prev => prev ? { ...prev, is_official: newStatus } : null);
        setDisplayImages(prev => prev.map(img => img.id === selectedImage.id ? { ...img, is_official: newStatus } : img));
        try {
            const { error } = await supabase
                .from('review_images')
                .update({ is_official: newStatus })
                .eq('id', selectedImage.id);
            if (error)
                throw error;
            toast({ title: newStatus ? "Added to Official Lookbook" : "Removed from Official Lookbook" });
        }
        catch (_error) {
            toast({ variant: "destructive", title: "Failed to update lookbook status" });
            // Revert
            setSelectedImage(prev => prev ? { ...prev, is_official: !newStatus } : null);
            setDisplayImages(prev => prev.map(img => img.id === selectedImage.id ? { ...img, is_official: !newStatus } : img));
        }
    };
    const googleSearchUrl = useMemo(() => {
        if (!building)
            return "";
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
    if (loading || !building) {
        return (_jsx(AppLayout, { title: "Loading...", children: _jsx("div", { className: "p-8", children: _jsx(Loader2, { className: "animate-spin" }) }) }));
    }
    return (_jsxs(AppLayout, { title: building.name, showBack: true, children: [_jsx(MetaHead, { title: building.name }), _jsx(BuildingHero, { src: heroImageUrl, alt: building.name }, heroImageUrl), _jsx("div", { className: "p-4 sm:p-6 lg:p-8", children: _jsxs("div", { className: "max-w-4xl mx-auto space-y-12", children: [_jsxs("section", { className: "space-y-4", children: [_jsx(BuildingHeader, { building: building, showEditLink: !!user, isEditing: isOfficialEditing, nameValue: draftOfficialData.name, yearValue: draftOfficialData.year_completed, onNameChange: (val) => setDraftOfficialData((prev) => ({ ...prev, name: val })), onYearChange: (val) => setDraftOfficialData((prev) => ({
                                        ...prev,
                                        year_completed: val,
                                    })) }), canEditOfficialData && (_jsx("div", { className: "flex justify-end", children: isOfficialEditing ? (_jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setIsOfficialEditing(false), disabled: isSavingOfficial, children: "Cancel" }), _jsxs(Button, { size: "sm", onClick: handleSaveOfficialData, disabled: isSavingOfficial, children: [isSavingOfficial && (_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" })), "Save Changes"] })] })) : (_jsx(Button, { variant: "ghost", size: "icon", onClick: () => setIsOfficialEditing(true), "aria-label": "Edit official data", children: _jsx(Pencil, { className: "w-4 h-4" }) })) })), _jsx(ArchitectStatement, { statement: draftOfficialData.architect_statement, isEditing: isOfficialEditing, onChange: (val) => setDraftOfficialData((prev) => ({
                                        ...prev,
                                        architect_statement: val,
                                    })), className: "mt-4" })] }), _jsx("section", { className: "mt-12 pt-8 border-t border-border-default", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-2 items-start", children: [_jsxs("div", { className: "space-y-6", children: [!isEditing && userStatus ? (
                                            // Summary View
                                            _jsxs("div", { className: "bg-surface-card rounded-sm p-6 border border-border-default space-y-4 group", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-bold uppercase tracking-widest text-text-secondary", children: "Your Activity" }), _jsx(Button, { variant: "ghost", size: "sm", asChild: true, children: _jsx(Link, { to: getBuildingUrl(building.id, building.slug, building.short_id) + "/review", children: "Edit" }) })] }), _jsxs("div", { className: "flex flex-wrap gap-4 items-center", children: [userStatus === 'visited' ? (_jsx(Badge, { className: "bg-brand-primary text-brand-primary-foreground hover:opacity-90 cursor-pointer", onClick: () => handleStatusChange('pending'), children: "Visited" })) : userStatus === 'ignored' ? (_jsx(Badge, { variant: "outline", className: "text-text-secondary border-dashed", children: "Hidden" })) : (_jsx(Badge, { variant: "secondary", className: "cursor-pointer hover:bg-surface-muted/80", onClick: () => handleStatusChange('visited'), children: "Saved" })), (userStatus === 'visited' || userStatus === 'pending') && (_jsx("div", { className: `flex items-center gap-0.5 ${myRating === 0 ? "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto" : ""}`, onMouseLeave: () => setHoverRating(null), children: [...Array(3)].map((_, i) => {
                                                                    const ratingValue = i + 1;
                                                                    const isFilled = hoverRating !== null ? ratingValue <= hoverRating : ratingValue <= myRating;
                                                                    return (_jsx(Circle, { className: `w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity ${isFilled ? "fill-brand-primary text-text-primary" : "fill-transparent text-text-secondary/20"}`, onMouseEnter: () => setHoverRating(ratingValue), onClick: () => handleRate(building.id, ratingValue === myRating ? 0 : ratingValue) }, i));
                                                                }) }))] }), note && _jsx("p", { className: "text-sm text-text-primary/90", children: note }), selectedCollectionIds.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-2", children: _jsxs(Badge, { variant: "outline", className: "text-xs border-dashed", children: ["In ", selectedCollectionIds.length, " Collection", selectedCollectionIds.length > 1 ? 's' : ''] }) })), userImages && userImages.length > 0 && (_jsx("div", { className: "flex gap-2 overflow-x-auto pb-2", children: userImages.map((img) => {
                                                            const publicUrl = getBuildingImageUrl(img.storage_path);
                                                            if (!publicUrl)
                                                                return null;
                                                            // Construct partial display image for local user images
                                                            const displayImg = {
                                                                id: img.id,
                                                                url: publicUrl,
                                                                likes_count: 0,
                                                                created_at: new Date().toISOString(), // Fallback
                                                                user: {
                                                                    username: profile?.username || user?.email || "Me",
                                                                    avatar_url: profile?.avatar_url || null
                                                                },
                                                                is_generated: img.is_generated ?? undefined,
                                                                is_official: img.is_official ?? undefined
                                                            };
                                                            return (_jsx("img", { src: publicUrl, className: "h-24 w-24 object-cover rounded-md border bg-surface-muted cursor-pointer hover:opacity-90 transition-opacity", alt: "Review photo", onClick: () => setSelectedImage(displayImg) }, img.id));
                                                        }) }))] })) : (
                                            // Edit View
                                            _jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center gap-2 w-full py-4 border-y border-dashed border-border-default/60", children: [userStatus && (_jsx(Button, { variant: "link", className: "text-text-secondary hover:text-feedback-destructive h-auto p-0 text-xs shrink-0", onClick: () => setShowDeleteAlert(true), children: "Remove from my list" })), _jsxs(Button, { variant: userStatus === 'visited' ? "default" : "secondary", size: "sm", className: "flex-1 rounded-full h-10 shadow-none hover:bg-surface-muted/80", onClick: () => handleStatusChange('visited'), children: [_jsx(Check, { className: "w-4 h-4 mr-2" }), "Visited"] }), _jsxs(Button, { variant: userStatus === 'pending' ? "default" : "secondary", size: "sm", className: "flex-1 rounded-full h-10 shadow-none hover:bg-surface-muted/80", onClick: () => handleStatusChange('pending'), children: [_jsx(Bookmark, { className: `w-4 h-4 mr-2 ${userStatus === 'pending' ? "fill-current" : ""}` }), userStatus === 'pending' ? "Saved" : "Save"] }), _jsxs(Button, { variant: userStatus === 'ignored' ? "default" : "secondary", size: "sm", className: "flex-1 rounded-full h-10 shadow-none hover:bg-surface-muted/80", onClick: () => handleStatusChange('ignored'), children: [_jsx(EyeOff, { className: "w-4 h-4 mr-2" }), "Hide"] })] }), _jsx("div", { className: "flex justify-center pt-2", children: (userStatus === 'visited' || userStatus === 'pending') && (_jsx(PersonalRatingButton, { buildingId: building.id, initialRating: myRating, onRate: handleRate, status: userStatus || 'visited', label: userStatus === 'pending' ? "Priority" : "Add points (optional)", variant: "inline" })) })] }), showNoteEditor && (userStatus === 'visited' || userStatus === 'pending') && (_jsxs("div", { className: "pt-4 border-t border-dashed space-y-4 animate-in fade-in slide-in-from-top-2", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium uppercase text-text-secondary", children: "Your Note" }), _jsx(Textarea, { placeholder: "Write a note...", value: note, onChange: (e) => setNote(e.target.value), className: "resize-none" })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { variant: pendingImages.length > 0 ? "secondary" : "outline", size: "sm", className: "gap-2 text-xs h-8", onClick: () => document.getElementById('hidden-file-input')?.click(), children: [_jsx(ImagePlus, { className: "w-3 h-3" }), "Add media"] }), _jsx("input", { id: "hidden-file-input", type: "file", multiple: true, accept: "image/*", className: "hidden", onChange: handleImageSelect, "aria-label": "Upload photos of this building" }), _jsxs(Button, { variant: showCollections || selectedCollectionIds.length > 0 ? "secondary" : "outline", size: "sm", className: "gap-2 text-xs h-8", onClick: () => setShowCollections(!showCollections), children: [_jsx(Plus, { className: "w-3 h-3" }), "Add to collection"] }), _jsxs(Button, { variant: showLinkEditor || userLinks.length > 0 ? "secondary" : "outline", size: "sm", className: "gap-2 text-xs h-8", onClick: () => setShowLinkEditor(!showLinkEditor), children: [_jsx(LinkIcon, { className: "w-3 h-3" }), "Add link"] })] }), pendingImages.length > 0 && (_jsx("div", { className: "grid grid-cols-3 sm:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-1", children: pendingImages.map((img) => (_jsxs("div", { className: "relative aspect-square group rounded-md overflow-hidden border bg-surface-muted", children: [_jsx("img", { src: img.preview, className: "w-full h-full object-cover", alt: "Preview" }), _jsx("button", { onClick: () => setPendingImages(prev => prev.map(p => p.id === img.id ? { ...p, is_generated: !p.is_generated } : p)), className: `absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-colors z-10 ${img.is_generated ? "bg-brand-primary text-brand-primary-foreground" : "bg-black/60 text-text-inverse hover:bg-black/80"}`, children: img.is_generated ? 'Render' : 'Photo' }), _jsx("button", { onClick: () => removePendingImage(img.id), className: "absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10", "aria-label": "Remove pending image", children: _jsx(Trash2, { className: "w-3 h-3" }) })] }, img.id))) })), showCollections && user && (_jsx("div", { className: "pt-2 animate-in fade-in slide-in-from-top-1", children: _jsx(CollectionSelector, { userId: user.id, selectedCollectionIds: selectedCollectionIds, onChange: setSelectedCollectionIds }) })), (showLinkEditor || userLinks.length > 0) && (_jsxs("div", { className: "space-y-3 pt-2 animate-in fade-in slide-in-from-top-1", children: [userLinks.length > 0 && (_jsx("div", { className: "space-y-2", children: userLinks.map(link => (_jsxs("div", { className: "flex items-center justify-between p-2 rounded-md bg-surface-muted/50 border text-sm", children: [_jsxs("div", { className: "flex flex-col overflow-hidden", children: [_jsx("span", { className: "font-medium truncate", children: link.title || link.url }), _jsx("span", { className: "text-xs text-text-secondary truncate opacity-70", children: link.url })] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6 text-text-secondary hover:text-feedback-destructive", onClick: () => handleRemoveLink(link.id), children: _jsx(Trash2, { className: "w-3 h-3" }) })] }, link.id))) })), showLinkEditor && (_jsxs("div", { className: "flex flex-col gap-2 p-3 bg-surface-muted/20 rounded-md border border-dashed", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(Label, { className: "text-[10px] uppercase text-text-secondary", children: "URL" }), _jsx(Input, { value: newLinkUrl, onChange: e => setNewLinkUrl(e.target.value), placeholder: "https://...", className: "h-8 text-xs" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx(Label, { className: "text-[10px] uppercase text-text-secondary", children: "Title" }), _jsx(Input, { value: newLinkTitle, onChange: e => setNewLinkTitle(e.target.value), placeholder: "Optional title", className: "h-8 text-xs" })] })] }), _jsx(Button, { size: "sm", variant: "secondary", onClick: handleAddLink, className: "self-end h-7 text-xs", children: "Add Link" })] }))] })), _jsx("div", { className: "flex justify-end pt-2", children: _jsxs(Button, { size: "sm", onClick: handleSaveNote, disabled: isSavingNote, children: [isSavingNote && _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Save"] }) })] }))] })), userStatus === 'pending' && (_jsx("div", { className: "pt-4 border-t border-dashed", children: !showVisitWith ? (_jsx(Button, { variant: "outline", className: "w-full justify-start text-text-secondary hover:text-text-primary", onClick: () => setShowVisitWith(true), children: _jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Users, { className: "w-4 h-4" }), "Visit with..."] }) })) : (_jsxs("div", { className: "animate-in fade-in slide-in-from-top-2 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-sm font-medium", children: "Visit with..." }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6", onClick: () => setShowVisitWith(false), children: _jsx(X, { className: "w-3 h-3" }) })] }), _jsxs("div", { className: "flex gap-2 items-start", children: [_jsx("div", { className: "flex-1", children: _jsx(UserPicker, { selectedIds: selectedFriends, onSelect: (id) => setSelectedFriends([...selectedFriends, id]), onRemove: (id) => setSelectedFriends(selectedFriends.filter(uid => uid !== id)) }) }), _jsx(Button, { size: "sm", disabled: selectedFriends.length === 0 || sendingInvites, onClick: handleSendInvites, children: sendingInvites ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsx(Send, { className: "w-4 h-4" }) })] }), _jsx("p", { className: "text-xs text-text-secondary", children: "Invite friends to join you. They'll get a notification." })] })) }))] }), _jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-2xl md:text-3xl font-semibold tracking-tight text-text-primary", children: "Details" }), _jsx(BuildingAttributes, { building: building })] })] }) }), _jsxs("section", { className: "mt-12 pt-8 border-t border-border-default space-y-4", children: [_jsx("h2", { className: "text-2xl md:text-3xl font-semibold tracking-tight text-text-primary", children: "Photos" }), _jsx(WidgetErrorBoundary, { children: displayImages.length > 0 ? ((() => {
                                        const officialCount = displayImages.filter((img) => img.is_official).length;
                                        const showTabs = officialCount > 0 && officialCount < displayImages.length;
                                        if (showTabs) {
                                            return (_jsxs(Tabs, { defaultValue: "all", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-2 mb-4", children: [_jsx(TabsTrigger, { value: "all", children: "All Photos" }), _jsx(TabsTrigger, { value: "official", children: "Official Lookbook" })] }), _jsx(TabsContent, { value: "all", className: "mt-0", children: _jsx("div", { className: "grid grid-cols-3 gap-2", children: displayImages.map((img) => (_jsx(BuildingImageCard, { image: img, initialIsLiked: likedImageIds.has(img.id), onOpen: () => setSelectedImage(img) }, img.id))) }) }), _jsx(TabsContent, { value: "official", className: "mt-0", children: _jsx("div", { className: "grid grid-cols-3 gap-2", children: displayImages
                                                                .filter((img) => img.is_official)
                                                                .map((img) => (_jsx(BuildingImageCard, { image: img, initialIsLiked: likedImageIds.has(img.id), onOpen: () => setSelectedImage(img) }, img.id))) }) })] }));
                                        }
                                        return (_jsx("div", { className: "grid grid-cols-3 gap-2", children: displayImages.map((img) => (_jsx(BuildingImageCard, { image: img, initialIsLiked: likedImageIds.has(img.id), onOpen: () => setSelectedImage(img) }, img.id))) }));
                                    })()) : (_jsx("div", { className: "aspect-[16/9] md:aspect-[21/9] rounded-sm overflow-hidden shadow-none border border-border-default relative group", children: _jsxs("div", { className: "w-full h-full bg-surface-muted flex flex-col items-center justify-center text-text-secondary text-center p-6", children: [_jsx(ImageIcon, { className: "w-12 h-12 text-text-secondary/20 mb-3" }), _jsx("h3", { className: "font-medium text-text-secondary mb-1", children: "No image yet" }), _jsx("p", { className: "text-xs text-text-secondary/50 max-w-[200px] mb-4", children: "Be the first to add a photo of this building" }), _jsx(Button, { variant: "outline", size: "sm", asChild: true, children: _jsxs(Link, { to: getBuildingUrl(building.id, building.slug, building.short_id) + "/review", children: [_jsx(ImagePlus, { className: "w-4 h-4 mr-2" }), "Upload photo"] }) })] }) })) }), _jsx("div", { className: "flex justify-center pt-2", children: _jsxs("a", { href: googleSearchUrl, target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 text-xs text-text-secondary hover:text-brand-primary hover:underline transition-colors", children: [_jsx(Search, { className: "w-3 h-3" }), "Search for photos on Google", _jsx(ExternalLink, { className: "w-3 h-3 opacity-50" })] }) })] }), _jsxs("section", { className: "mt-12 pt-8 border-t border-border-default space-y-6", children: [_jsx("h2", { className: "text-2xl md:text-3xl font-semibold tracking-tight text-text-primary", children: "Location" }), _jsxs("div", { className: "space-y-4 group", children: [building.location_precision === "approximate" && (_jsxs(Alert, { className: "border-amber-500/50 bg-amber-500/10 text-amber-500", children: [_jsx(AlertTriangle, { className: "h-4 w-4 stroke-amber-500" }), _jsx(AlertDescription, { className: "ml-2", children: "Exact location not verified. This marker indicates the general village/locality." })] })), coordinates ? (_jsx(WidgetErrorBoundary, { children: _jsx(BuildingLocationMap, { lat: coordinates.lat, lng: coordinates.lng, status: userStatus, rating: myRating, tierRank: building.tier_rank, locationPrecision: building.location_precision, isExpanded: isMapExpanded, onToggleExpand: () => setIsMapExpanded(!isMapExpanded), className: isMapExpanded ? "" : "h-48 w-full" }) })) : (_jsxs("div", { className: "h-48 bg-surface-muted/20 rounded-sm border border-dashed border-border-default flex items-center justify-center flex-col gap-2 text-text-secondary", children: [_jsx(MapPin, { className: "w-6 h-6 opacity-50" }), _jsx("span", { className: "text-xs uppercase tracking-widest", children: "Location Unavailable" })] })), _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-text-secondary w-full", children: [_jsx(MapPin, { className: "w-4 h-4 shrink-0" }), isOfficialEditing ? (_jsxs("div", { className: "flex gap-2 w-full max-w-sm", children: [_jsx(Input, { value: draftOfficialData.city, onChange: (e) => setDraftOfficialData((prev) => ({
                                                                        ...prev,
                                                                        city: e.target.value,
                                                                    })), placeholder: "City", className: "h-8 text-sm" }), _jsx(Input, { value: draftOfficialData.country, onChange: (e) => setDraftOfficialData((prev) => ({
                                                                        ...prev,
                                                                        country: e.target.value,
                                                                    })), placeholder: "Country", className: "h-8 text-sm" })] })) : (_jsx("span", { className: "text-sm font-medium", children: [building.city, building.country]
                                                                .filter(Boolean)
                                                                .join(", ") || building.address })), user && !isOfficialEditing && (_jsx(Link, { to: getBuildingUrl(building.id, building.slug, building.short_id) + "/edit", className: "hidden group-hover:inline-flex items-center justify-center p-1 rounded-sm hover:bg-surface-muted text-text-secondary/50 hover:text-text-primary transition-colors ml-1", title: "Edit building", children: _jsx(Pencil, { className: "w-3 h-3" }) }))] }), coordinates && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", size: "sm", className: "shrink-0 h-8", onClick: () => {
                                                                if (building.location_precision === "approximate") {
                                                                    setShowDirectionsAlert(true);
                                                                }
                                                                else {
                                                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`, "_blank");
                                                                }
                                                            }, children: building.status === "Lost"
                                                                ? building.location_precision === "approximate"
                                                                    ? "Navigate to Site (Approximate)"
                                                                    : "Navigate to Site"
                                                                : building.location_precision === "approximate"
                                                                    ? "Get Directions (Approximate)"
                                                                    : "Get Directions" }), _jsx(AlertDialog, { open: showDirectionsAlert, onOpenChange: setShowDirectionsAlert, children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Exact Location Unknown" }), _jsxs(AlertDialogDescription, { children: ["This building's location is approximate. The directions will guide you to the general vicinity (e.g. village center).", _jsx("br", {}), _jsx("br", {}), "Please look around when you arrive."] })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: () => {
                                                                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`, "_blank");
                                                                                }, children: building.status === "Lost"
                                                                                    ? "Navigate to Site"
                                                                                    : "Get Directions" })] })] }) })] }))] }), (building.status === "Lost" ||
                                            building.status === "Unbuilt" ||
                                            building.status === "Under Construction") && (_jsxs(Alert, { className: "mt-4 border-feedback-destructive/50 bg-feedback-destructive/10 text-feedback-destructive", children: [_jsx(AlertTriangle, { className: "h-4 w-4 stroke-feedback-destructive" }), _jsx(AlertDescription, { className: "ml-2 font-medium", children: building.status === "Lost"
                                                        ? "This building is lost to time. It no longer stands at this location."
                                                        : building.status === "Unbuilt"
                                                            ? "This project was never built."
                                                            : "This building is under construction." })] }))] })] }), (linksLoading || topLinks.length > 0) && (_jsx("section", { className: "mt-12 pt-8 border-t border-border-default", children: _jsx(WidgetErrorBoundary, { children: _jsxs("div", { children: [_jsx("h2", { className: "text-2xl md:text-3xl font-semibold tracking-tight text-text-primary mb-4", children: "Top Community Resources" }), _jsx("div", { className: "space-y-2", children: linksLoading ? (_jsxs(_Fragment, { children: [_jsx(Skeleton, { className: "h-12 w-full rounded-sm" }), _jsx(Skeleton, { className: "h-12 w-full rounded-sm" })] })) : (topLinks.map((link) => {
                                                let domain = "";
                                                try {
                                                    domain = new URL(link.url).hostname;
                                                }
                                                catch {
                                                    // ignore
                                                }
                                                const displayDomain = domain || link.url;
                                                const hasTitle = !!link.title;
                                                const isLiked = likedLinkIds.has(link.link_id);
                                                return (_jsxs("div", { className: "flex items-center justify-between p-3 rounded-sm bg-surface-muted/50 hover:bg-surface-muted transition-colors border border-transparent hover:border-border-default group", children: [_jsxs("a", { href: link.url, target: "_blank", rel: "noopener noreferrer", className: "flex-1 flex flex-col gap-0.5 overflow-hidden cursor-pointer", children: [_jsx("span", { className: "font-medium truncate pr-2 text-sm group-hover:text-brand-primary transition-colors", children: hasTitle ? link.title : displayDomain }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-text-secondary", children: [hasTitle && (_jsx("span", { className: "truncate max-w-[150px]", children: displayDomain })), hasTitle && link.user_username && _jsx("span", { children: "\u2022" }), link.user_username && (_jsxs("span", { children: ["shared by @", link.user_username] }))] })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsxs(Button, { variant: "ghost", size: "sm", className: `h-8 px-2 gap-1.5 text-xs hover:bg-transparent ${isLiked
                                                                        ? "text-pink-500 hover:text-pink-600"
                                                                        : "text-text-secondary hover:text-pink-500"}`, onClick: (e) => {
                                                                        e.preventDefault();
                                                                        handleLinkLike(link.link_id);
                                                                    }, "aria-label": isLiked ? "Unlike community resource" : "Like community resource", children: [_jsx(Heart, { className: `w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}` }), _jsx("span", { children: link.like_count })] }), _jsx("a", { href: link.url, target: "_blank", rel: "noopener noreferrer", className: "p-1.5 rounded-md hover:bg-surface-default text-text-secondary/50 hover:text-text-primary transition-colors", "aria-label": "Open resource", children: _jsx(ExternalLink, { className: "w-4 h-4" }) })] })] }, link.link_id));
                                            })) })] }) }) })), _jsxs("section", { className: "mt-12 pt-8 border-t border-border-default", children: [_jsx("h2", { className: "text-2xl md:text-3xl font-semibold tracking-tight text-text-primary mb-4", children: "Community Notes" }), _jsx("div", { className: "space-y-4", children: entries.length === 0 ? (_jsx("p", { className: "text-text-secondary text-sm", children: "No one has visited this building yet." })) : (entries.map((entry) => (_jsxs("div", { className: `flex gap-4 p-4 bg-surface-muted/10 rounded-sm ${entry.user.is_architect_of_building
                                            ? "border-l-2 border-l-[#eeff41ff] bg-surface-default border-t border-r border-b border-border-default/50"
                                            : ""}`, children: [_jsxs(Avatar, { children: [_jsx(AvatarImage, { src: entry.user.avatar_url || undefined }), _jsx(AvatarFallback, { children: entry.user.username?.[0] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(Link, { to: `/profile/${entry.user.username || entry.user_id}`, className: "font-bold text-sm hover:underline", children: entry.user.username }), entry.user.is_verified_architect && (_jsx("div", { className: "inline-flex items-center text-text-primary ml-1 align-middle", "data-testid": "verified-badge-icon", title: "Verified Architect", children: _jsx(BadgeCheck, { className: "w-4 h-4" }) })), entry.status === "visited" && (_jsx(Badge, { variant: "secondary", className: "text-[10px] h-5 px-1.5", children: "Visited" })), entry.status === "pending" && (_jsx(Badge, { variant: "outline", className: "text-[10px] h-5 px-1.5", children: "Saved" })), _jsxs(Link, { to: `/review/${entry.id}`, className: "text-xs text-text-secondary hover:underline", children: [formatDistanceToNow(new Date(entry.created_at)), " ago"] })] }), _jsxs(Link, { to: `/review/${entry.id}`, className: "block group", children: [entry.rating && (_jsx("div", { className: "flex items-center gap-0.5 my-1 group-hover:opacity-80 transition-opacity", children: [...Array(3)].map((_, i) => (_jsx(Circle, { className: `w-3 h-3 ${i < entry.rating
                                                                        ? "fill-brand-primary text-text-primary"
                                                                        : "fill-transparent text-text-secondary/20"}` }, i))) })), entry.content && (_jsx("p", { className: "text-sm mt-1 text-text-secondary group-hover:text-text-primary transition-colors", children: entry.content }))] }), entry.images && entry.images.length > 0 && (_jsx("div", { className: "flex gap-2 mt-3 overflow-x-auto pb-2", children: entry.images.map((img) => {
                                                            const publicUrl = getBuildingImageUrl(img.storage_path);
                                                            if (!publicUrl)
                                                                return null;
                                                            const displayImg = {
                                                                id: img.id,
                                                                url: publicUrl,
                                                                likes_count: 0,
                                                                created_at: img.created_at || entry.created_at,
                                                                user: entry.user,
                                                            };
                                                            return (_jsx("img", { src: publicUrl, className: "h-24 w-24 object-cover rounded-md border bg-surface-muted cursor-pointer hover:opacity-90 transition-opacity", alt: "Review photo", onClick: () => setSelectedImage(displayImg) }, img.id));
                                                        }) }))] })] }, entry.id)))) })] })] }) }), _jsx(ImageDetailsDialog, { imageId: selectedImage?.id || null, initialUrl: selectedImage?.url || null, type: selectedImage?.type || 'image', uploadedBy: selectedImage?.user || null, uploadDate: selectedImage?.created_at, isOpen: !!selectedImage, onClose: () => setSelectedImage(null), onNext: handleNextImage, onPrev: handlePrevImage, hasNext: selectedIndex < displayImages.length - 1, hasPrev: selectedIndex > 0, isGenerated: selectedImage?.is_generated, isOfficial: selectedImage?.is_official, isHero: selectedImage?.id === building?.hero_image_id, canEdit: canEditOfficialData, onToggleOfficial: handleToggleOfficial, onSetHero: handleSetHeroImage }), _jsx(AlertDialog, { open: showDeleteAlert, onOpenChange: setShowDeleteAlert, children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Remove from list?" }), _jsx(AlertDialogDescription, { children: deleteWarningMessage || "This will delete your rating, status, and any notes for this building. This action cannot be undone." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleDelete, className: "bg-feedback-destructive text-feedback-destructive-foreground hover:opacity-90", children: "Remove" })] })] }) })] }));
}
