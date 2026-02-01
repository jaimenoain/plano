// Implements "Write Review" page with rating, text, and image upload
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Circle,
  Upload,
  X,
  Loader2,
  ImagePlus,
  Link as LinkIcon,
  Trash2,
  Plus,
  Pencil,
  Check,
  Bookmark
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { resizeImage } from "@/lib/image-compression";
import { getBuildingUrl } from "@/utils/url";
import { getBuildingImageUrl } from "@/utils/image";
import { uploadFile, deleteFiles, uploadFileWithProgress } from "@/utils/upload";
import { CollectionSelector } from "@/components/profile/CollectionSelector";
import { VideoCompressionService } from "@/utils/video-compression";
import { getRatingLabel } from "@/components/PersonalRatingButton";

interface ReviewImage {
  id: string;
  file?: File;
  preview: string;
  storage_path?: string;
}

interface VideoState {
  file: File | null;
  preview: string | null;
  storage_path: string | null;
  status: 'idle' | 'compressing' | 'uploading' | 'ready' | 'error';
  progress: number;
}

export default function WriteReview() {
  const { id } = useParams(); // buildingId
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingSlug, setBuildingSlug] = useState<string | null>(null);
  const [buildingShortId, setBuildingShortId] = useState<number | null>(null);

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  const [images, setImages] = useState<ReviewImage[]>([]);
  const [deletedImages, setDeletedImages] = useState<ReviewImage[]>([]);

  const [video, setVideo] = useState<VideoState>({
    file: null,
    preview: null,
    storage_path: null,
    status: 'idle',
    progress: 0
  });
  const [deletedVideoPath, setDeletedVideoPath] = useState<string | null>(null);

  const [status, setStatus] = useState<'visited' | 'pending'>('visited');
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<string>("public");

  const [links, setLinks] = useState<{ id: string, url: string, title: string }[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");

  const isProcessingVideo = video.status === 'compressing' || video.status === 'uploading';

  const [showLists, setShowLists] = useState(false);
  const [showLinks, setShowLinks] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;

        // 1. Fetch Building Name
        let query = supabase.from("buildings").select("id, name, slug, short_id");
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id!);
        if (isUUID) {
            query = query.eq("id", id);
        } else {
            query = query.eq("short_id", parseInt(id!));
        }

        const { data: building, error: buildingError } = await query.single();

        if (buildingError) throw buildingError;
        setBuildingName(building.name);
        setBuildingId(building.id);
        // @ts-ignore
        setBuildingSlug(building.slug);
        // @ts-ignore
        setBuildingShortId(building.short_id);

        // 2. Fetch Existing Review/Status
        if (user) {
          // Fetch collections for this building
          const { data: collectionItems } = await supabase
              .from("collection_items")
              .select("collection_id, collections!inner(owner_id)")
              .eq("building_id", building.id)
              .eq("collections.owner_id", user.id);

          if (collectionItems) {
              const ids = collectionItems.map(c => c.collection_id);
              setSelectedCollectionIds(ids);
              if (ids.length > 0) setShowLists(true);
          }

          const { data: userBuilding, error: ubError } = await supabase
            .from("user_buildings")
            .select("id, rating, content, status, visibility, video_url")
            .eq("user_id", user.id)
            .eq("building_id", building.id)
            .maybeSingle();

          if (ubError) throw ubError;

          if (userBuilding) {
            setReviewId(userBuilding.id);
            if (userBuilding.rating) setRating(userBuilding.rating);
            if (userBuilding.content) setContent(userBuilding.content);
            
            // Merged Logic: Set visibility setting
            if (userBuilding.visibility) setVisibility(userBuilding.visibility);
            
            if (userBuilding.status === 'pending') {
              setStatus('pending');
            } else {
              setStatus('visited');
            }

            if (userBuilding.video_url) {
              setVideo({
                file: null,
                preview: getBuildingImageUrl(userBuilding.video_url) || null,
                storage_path: userBuilding.video_url,
                status: 'ready',
                progress: 100
              });
            }

            // Fetch Links
            const { data: existingLinks } = await supabase
              .from("review_links")
              .select("id, url, title")
              .eq("review_id", userBuilding.id);

            if (existingLinks) {
              setLinks(existingLinks);
              if (existingLinks.length > 0) setShowLinks(true);
            }

            // Fetch Images
            const { data: remoteImages } = await supabase
              .from('review_images')
              .select('id, storage_path')
              .eq('review_id', userBuilding.id);

            if (remoteImages) {
              const loadedImages: ReviewImage[] = remoteImages.map(img => ({
                id: img.id,
                preview: getBuildingImageUrl(img.storage_path) || "",
                storage_path: img.storage_path
              }));
              setImages(loadedImages);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error loading data" });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (id) {
        fetchData();
      }
    }
  }, [id, user, authLoading, navigate]);

  const processFiles = useCallback(async (files: File[]) => {
    const newImages: ReviewImage[] = [];
    for (const file of files) {
      try {
        const compressedFile = await resizeImage(file);
        const previewUrl = URL.createObjectURL(compressedFile);
        newImages.push({
          id: crypto.randomUUID(),
          file: compressedFile,
          preview: previewUrl
        });
      } catch (error) {
        console.error("Error compressing image:", error);
        toast({
          variant: "destructive",
          title: "Error processing image",
          description: file.name
        });
      }
    }
    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
  }, [toast]);

  const processVideo = useCallback(async (file: File) => {
    try {
      // 1. Set Compressing State
      setVideo(prev => ({
        ...prev,
        file,
        status: 'compressing',
        progress: 0
      }));

      // 2. Compress Video
      const compressedFile = await VideoCompressionService.compressVideo(file);

      // 3. Set Uploading State
      setVideo(prev => ({
        ...prev,
        file: compressedFile,
        status: 'uploading',
        progress: 0
      }));

      // 4. Upload Video
      const key = await uploadFileWithProgress(compressedFile, (progress) => {
        setVideo(prev => ({ ...prev, progress }));
      });

      // 5. Set Ready State
      setVideo({
        file: compressedFile,
        preview: URL.createObjectURL(compressedFile),
        storage_path: key,
        status: 'ready',
        progress: 100
      });

    } catch (error) {
      console.error("Video processing error:", error);
      toast({
        variant: "destructive",
        title: "Video upload failed",
        description: error instanceof Error ? error.message : "Unknown error"
      });
      setVideo(prev => ({
        ...prev,
        status: 'error',
        progress: 0
      }));
    }
  }, [toast]);

  const processMediaSelection = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));

    const tasks: Promise<void>[] = [];

    // Process Videos
    if (videoFiles.length > 0) {
      // Constraint: Only one video allowed per review
      if (videoFiles.length > 1) {
        toast({
          variant: "destructive",
          title: "Limit exceeded",
          description: "Only one video per review is allowed."
        });
      } else {
         // Check if video already exists or is processing
         const hasExistingVideo = video.status !== 'idle' && video.status !== 'error';
         if (hasExistingVideo) {
           toast({
             variant: "destructive",
             title: "Limit exceeded",
             description: "You already have a video. Remove the existing one first."
           });
         } else {
           tasks.push(processVideo(videoFiles[0]));
         }
      }
    }

    // Process Images
    if (imageFiles.length > 0) {
      tasks.push(processFiles(imageFiles));
    }

    await Promise.all(tasks);
  }, [processFiles, processVideo, toast, video.status]);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      // Do not await processMediaSelection to ensure input is cleared immediately
      processMediaSelection(files).catch(console.error);
      // Cleanup input
      e.target.value = "";
    }
  };

  const removeVideo = () => {
    if (video.storage_path) {
      setDeletedVideoPath(video.storage_path);
    }
    if (video.preview && video.preview.startsWith('blob:')) {
      URL.revokeObjectURL(video.preview);
    }
    setVideo({
      file: null,
      preview: null,
      storage_path: null,
      status: 'idle',
      progress: 0
    });
  };

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;

      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        const hasFiles = Array.from(e.dataTransfer.items).some(
          (item) => item.kind === "file"
        );
        if (hasFiles) {
          setIsDragging(true);
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (submitting || isProcessingVideo) return;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const items = Array.from(e.dataTransfer.files);
        // Do not await processMediaSelection to ensure non-blocking UI
        processMediaSelection(items).catch(console.error);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [processMediaSelection, submitting, isProcessingVideo]);

  const removeImage = (imageId: string) => {
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== imageId);
      const removed = prev.find(img => img.id === imageId);

      if (removed) {
        if (removed.storage_path) {
          // Track for deletion if it's an existing image
          setDeletedImages(prevDeleted => [...prevDeleted, removed]);
        } else {
          // Only revoke object URL for new uploads
          if (removed.preview.startsWith('blob:')) {
            URL.revokeObjectURL(removed.preview);
          }
        }
      }
      return newImages;
    });
  };

  const addLink = () => {
    if (links.length >= 5) {
      toast({
        variant: "destructive",
        title: "Limit reached",
        description: "Maximum 5 links allowed."
      });
      return;
    }

    if (!newLinkUrl.trim()) {
      toast({
        variant: "destructive",
        title: "URL required",
        description: "Please enter a valid URL."
      });
      return;
    }

    let urlToValidate = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(urlToValidate)) {
      urlToValidate = "https://" + urlToValidate;
    }

    try {
      new URL(urlToValidate); // Validate URL format
    } catch {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g. https://example.com)."
      });
      return;
    }

    setLinks(prev => [...prev, {
      id: crypto.randomUUID(),
      url: urlToValidate,
      title: newLinkTitle
    }]);

    setNewLinkUrl("");
    setNewLinkTitle("");
  };

  const removeLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const handleDelete = async () => {
    if (!reviewId) return;
    setSubmitting(true);
    try {
      // 1. Delete images from storage
      const imagesToDelete = images
        .map(img => img.storage_path)
        .filter((path): path is string => !!path);

      if (imagesToDelete.length > 0) {
        await deleteFiles(imagesToDelete);
      }

      // Delete video if exists
      if (video.storage_path) {
        await deleteFiles([video.storage_path]);
      }

      // 2. Delete the record
      const { error } = await supabase
        .from('user_buildings')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast({ title: "Review deleted" });
      navigate(getBuildingUrl(buildingId, buildingSlug, buildingShortId));

    } catch (error) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete review",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !buildingId) return;

    setSubmitting(true);
    try {
      // 1. Upsert User Building (Review)
      const { data: userBuilding, error: upsertError } = await supabase
        .from("user_buildings")
        .upsert({
          user_id: user.id,
          building_id: buildingId,
          rating: rating === 0 ? null : rating,
          content: content,
          status: status,
          visibility: visibility,
          video_url: video.storage_path, // Save video path
          edited_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (!userBuilding) throw new Error("Failed to save review");

      const reviewId = userBuilding.id;

      // Update Collections
      const { data: currentItems } = await supabase
        .from("collection_items")
        .select("id, collection_id, collections!inner(owner_id)")
        .eq("building_id", buildingId)
        .eq("collections.owner_id", user.id);

      const currentCollectionIds = new Set(currentItems?.map(c => c.collection_id) || []);
      const newCollectionIds = new Set(selectedCollectionIds);

      const toAdd = selectedCollectionIds.filter(id => !currentCollectionIds.has(id));
      if (toAdd.length > 0) {
          await supabase.from("collection_items").insert(
              toAdd.map(cid => ({ collection_id: cid, building_id: buildingId }))
          );
      }

      const itemsToRemove = currentItems?.filter(item => !newCollectionIds.has(item.collection_id)).map(item => item.id) || [];
      if (itemsToRemove.length > 0) {
          await supabase.from("collection_items").delete().in("id", itemsToRemove);
      }

      // 2. Handle Links
      // Delete existing links (simplest update strategy)
      const { error: deleteLinksError } = await supabase
        .from("review_links")
        .delete()
        .eq("review_id", reviewId);

      if (deleteLinksError) throw deleteLinksError;

      // Insert new links
      if (links.length > 0) {
        const linksPayload = links.map((l) => ({
          review_id: reviewId,
          user_id: user.id,
          url: l.url,
          title: l.title,
        }));

        const { error: insertLinksError } = await supabase
          .from("review_links")
          .insert(linksPayload);

        if (insertLinksError) throw insertLinksError;
      }

      // 3. Handle Image Deletions
      if (deletedImages.length > 0) {
        const idsToDelete = deletedImages.map(img => img.id);
        const { error: dbDeleteError } = await supabase
          .from('review_images')
          .delete()
          .in('id', idsToDelete);

        if (dbDeleteError) throw dbDeleteError;

        const pathsToDelete = deletedImages
          .map(img => img.storage_path)
          .filter((path): path is string => !!path);

        if (pathsToDelete.length > 0) {
          try {
            await deleteFiles(pathsToDelete);
          } catch (error) {
            console.error("Error cleaning up storage:", error);
          }
        }
      }

      // Handle Video Deletion (orphaned video file from previous save)
      if (deletedVideoPath) {
        try {
          await deleteFiles([deletedVideoPath]);
        } catch (error) {
          console.error("Error deleting old video:", error);
        }
      }

      // 4. Handle New Image Uploads
      const newImages = images.filter(img => img.file);
      if (newImages.length > 0) {
        const uploadPromises = newImages.map(async (img) => {
          if (!img.file) return;

          const storagePath = await uploadFile(img.file, reviewId);

          // Insert Image Record
          const { error: insertError } = await supabase
            .from('review_images')
            .insert({
              review_id: reviewId,
              user_id: user.id,
              storage_path: storagePath
            });

          if (insertError) throw insertError;
        });

        await Promise.all(uploadPromises);
      }

      toast({ title: "Review published!" });
      navigate(getBuildingUrl(buildingId, buildingSlug, buildingShortId));

    } catch (error) {
      console.error("Submission error:", error);
      toast({
        variant: "destructive",
        title: "Failed to submit review",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
      if (video.preview && video.preview.startsWith('blob:')) {
        URL.revokeObjectURL(video.preview);
      }
    };
  }, [images, video.preview]);

  const hasMedia = images.length > 0 || video.status !== 'idle' || !!video.preview;

  if (loading) {
    return (
      <AppLayout title="Loading...">
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Write Review"
      showBack
    >
      <div className="max-w-2xl mx-auto p-4 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{buildingName}</h1>
          <p className="text-muted-foreground">Share your experience</p>
        </div>

        {/* Status */}
        <div className="flex bg-muted/50 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setStatus('visited')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === 'visited' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Check className="w-4 h-4" />
            Visited
          </button>
          <button
            type="button"
            onClick={() => setStatus('pending')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === 'pending' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Bookmark className="w-4 h-4" />
            Bucket List
          </button>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium uppercase text-muted-foreground">Add points (Optional)</label>
          <div
            className="flex items-center gap-2"
            onMouseLeave={() => setHoverRating(null)}
          >
            {[1, 2, 3].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onClick={() => setRating(star)}
              >
                <Circle
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating ?? rating)
                      ? "fill-[#595959] text-[#595959]"
                      : "text-muted-foreground/20"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {hoverRating ? getRatingLabel(hoverRating) : (rating ? getRatingLabel(rating) : "")}
            </span>
          </div>
        </div>

        {/* Text Review */}
        <div className="space-y-2">
          <label className="text-sm font-medium uppercase text-muted-foreground">Review (Optional)</label>
          <Textarea
            placeholder="What did you think about this building?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none"
          />
        </div>

        {/* Unified Media Upload */}
        <div className="space-y-4">
            <input
                type="file"
                ref={mediaInputRef}
                className="hidden"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={handleMediaSelect}
                disabled={submitting || video.status === 'compressing' || video.status === 'uploading'}
            />

            {!hasMedia ? (
                // Empty State
                <div
                    onClick={() => mediaInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-muted-foreground/50 cursor-pointer transition-all gap-3"
                >
                    <div className="p-4 bg-muted rounded-full">
                         <ImagePlus className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-lg">Add Photos or Video</p>
                        <p className="text-sm text-muted-foreground">Share your experience</p>
                    </div>
                </div>
            ) : (
                // Populated State
                <div className="space-y-4">
                    {/* Video Component */}
                    {(video.status !== 'idle' || video.preview) && (
                        <div className="relative rounded-lg overflow-hidden border bg-muted">
                             {video.status === 'compressing' && (
                                 <div className="p-10 flex flex-col items-center justify-center gap-3">
                                   <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                   <p className="text-sm font-medium">Optimizando vídeo...</p>
                                 </div>
                               )}

                               {video.status === 'uploading' && (
                                 <div className="p-10 flex flex-col items-center justify-center gap-3 w-full">
                                   <div className="w-full max-w-xs bg-secondary h-2 rounded-full overflow-hidden">
                                     <div
                                       className="bg-primary h-full transition-all duration-300 ease-out"
                                       style={{ width: `${video.progress}%` }}
                                     />
                                   </div>
                                   <p className="text-sm font-medium">Uploading... {Math.round(video.progress)}%</p>
                                 </div>
                               )}

                               {video.status === 'ready' && video.preview && (
                                 <div className="relative aspect-video bg-black">
                                   <video
                                     src={video.preview}
                                     controls
                                     className="w-full h-full"
                                   />
                                   <button
                                     onClick={removeVideo}
                                     className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                                   >
                                     <X className="w-4 h-4" />
                                   </button>
                                 </div>
                               )}

                               {video.status === 'error' && (
                                 <div className="p-10 flex flex-col items-center justify-center gap-3 text-destructive">
                                   <p className="font-medium">Upload failed</p>
                                   <Button variant="outline" size="sm" onClick={() => setVideo(prev => ({ ...prev, status: 'idle', progress: 0 }))}>
                                     Try Again
                                   </Button>
                                 </div>
                               )}
                        </div>
                    )}

                    {/* Image Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {images.map((img) => (
                             <div key={img.id} className="relative aspect-square group rounded-lg overflow-hidden border bg-muted">
                               <img
                                 src={img.preview}
                                 alt="Preview"
                                 className="w-full h-full object-cover"
                               />
                               <button
                                 onClick={() => removeImage(img.id)}
                                 className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                 <X className="w-4 h-4" />
                               </button>
                             </div>
                        ))}
                        {/* Add Button */}
                        <button
                            onClick={() => mediaInputRef.current?.click()}
                            className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                        >
                            <Plus className="w-6 h-6 mb-1" />
                            <span className="text-xs font-medium">Add</span>
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Collections */}
        {showLists && user && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
             <CollectionSelector
                userId={user.id}
                selectedCollectionIds={selectedCollectionIds}
                onChange={setSelectedCollectionIds}
             />
          </div>
        )}

        {/* Resources & Links */}
        {showLinks && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label className="text-sm font-medium uppercase text-muted-foreground">Resources & Links</Label>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="flex-[2]"
                />
                <Input
                  placeholder="Title (optional)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addLink}
                disabled={submitting}
                className="w-full sm:w-auto self-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </div>

            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link) => {
                  let domain = "";
                  try {
                    domain = new URL(link.url).hostname;
                  } catch { }

                  return (
                    <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-background rounded border">
                          <LinkIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate text-sm">{link.title || link.url}</p>
                          <p className="text-xs text-muted-foreground truncate">{domain}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLink(link.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!showLists && (
            <Button variant="outline" size="sm" onClick={() => setShowLists(true)} className="gap-2">
               <Plus className="w-4 h-4" /> Add to my maps
            </Button>
          )}
          {!showLinks && (
            <Button variant="outline" size="sm" onClick={() => setShowLinks(true)} className="gap-2">
               <LinkIcon className="w-4 h-4" /> Add link
            </Button>
          )}
        </div>

        {/* Visibility */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Visibility:</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors w-fit">
                <span className="text-sm">{visibility.charAt(0).toUpperCase() + visibility.slice(1)}</span>
                <Pencil className="w-3 h-3" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setVisibility("public")}>Public</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVisibility("contacts")}>Contacts</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVisibility("private")}>Private</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex justify-end gap-4">
          {reviewId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive mr-auto" disabled={submitting || isProcessingVideo}>
                  Delete Review
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your review and photos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || isProcessingVideo}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitting ? "Publishing..." : (isProcessingVideo ? "Processing Video..." : "Publish Review")}
          </Button>
        </div>

      </div>

      {isDragging && (
        <div
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-primary m-4 rounded-xl animate-in fade-in duration-200 pointer-events-none"
        >
          <div className="bg-background p-8 rounded-full mb-4 shadow-lg">
             <Upload className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Drop media here</h2>
        </div>
      )}
    </AppLayout>
  );
}