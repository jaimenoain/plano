// Implements "Write Review" page with rating, text, and image upload
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Circle, Upload, X, Loader2, ImagePlus, Link, Trash2, Plus, Pencil
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { uploadFile, deleteFiles } from "@/utils/upload";
import { AutocompleteTagInput } from "@/components/ui/autocomplete-tag-input";

interface ReviewImage {
  id: string;
  file?: File;
  preview: string;
  storage_path?: string;
}

export default function WriteReview() {
  const { id } = useParams(); // buildingId
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [buildingName, setBuildingName] = useState("");
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingSlug, setBuildingSlug] = useState<string | null>(null);
  const [buildingShortId, setBuildingShortId] = useState<number | null>(null);

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [images, setImages] = useState<ReviewImage[]>([]);
  const [deletedImages, setDeletedImages] = useState<ReviewImage[]>([]);
  const [existingStatus, setExistingStatus] = useState<'visited' | 'pending' | 'ignored' | null>(null);
  const [visibility, setVisibility] = useState<string>("public");

  const [links, setLinks] = useState<{ id: string, url: string, title: string }[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");

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
          // Fetch Smart Suggestions (Recent Tags)
          // We limit to 50 recent interactions to find the most recently used tags
          const { data: recentLogs } = await supabase
            .from("user_buildings")
            .select("tags, edited_at")
            .eq("user_id", user.id)
            .not("tags", "is", null)
            .order("edited_at", { ascending: false })
            .limit(50);

          if (recentLogs) {
            const uniqueTags = new Set<string>();
            // Flatten and dedup preserving order (recency)
            recentLogs.forEach(log => {
              log.tags?.forEach(tag => uniqueTags.add(tag));
            });
            setSuggestions(Array.from(uniqueTags).slice(0, 20));
          }

          const { data: userBuilding, error: ubError } = await supabase
            .from("user_buildings")
            .select("id, rating, content, status, tags, visibility")
            .eq("user_id", user.id)
            .eq("building_id", building.id)
            .maybeSingle();

          if (ubError) throw ubError;

          if (userBuilding) {
            if (userBuilding.rating) setRating(userBuilding.rating);
            if (userBuilding.content) setContent(userBuilding.content);
            if (userBuilding.tags) setTags(userBuilding.tags);
            if (userBuilding.visibility) setVisibility(userBuilding.visibility);
            setExistingStatus(userBuilding.status);

            // Fetch Links
            const { data: existingLinks } = await supabase
              .from("review_links")
              .select("id, url, title")
              .eq("review_id", userBuilding.id);

            if (existingLinks) {
              setLinks(existingLinks);
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      // Process each file
      for (const file of files) {
        try {
          const compressedFile = await resizeImage(file);
          const previewUrl = URL.createObjectURL(compressedFile);

          setImages(prev => [...prev, {
            id: crypto.randomUUID(),
            file: compressedFile,
            preview: previewUrl
          }]);
        } catch (error) {
          console.error("Error compressing image:", error);
          toast({
            variant: "destructive",
            title: "Error processing image",
            description: file.name
          });
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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

  const handleSubmit = async () => {
    if (!user || !buildingId) return;
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Rating required",
        description: "Please select a star rating."
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upsert User Building (Review)
      const statusToUse = existingStatus || 'visited';

      const { data: userBuilding, error: upsertError } = await supabase
        .from("user_buildings")
        .upsert({
          user_id: user.id,
          building_id: buildingId,
          rating: rating,
          content: content,
          tags: tags,
          status: statusToUse,
          visibility: visibility,
          edited_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (!userBuilding) throw new Error("Failed to save review");

      const reviewId = userBuilding.id;

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
    };
  }, [images]);

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
          <div className="mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors w-fit">
                  <span className="text-sm">Visibility: {visibility.charAt(0).toUpperCase() + visibility.slice(1)}</span>
                  <Pencil className="w-3 h-3" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setVisibility("public")}>Public</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVisibility("private")}>Private</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium uppercase text-muted-foreground">Rating</label>
          <div
            className="flex items-center gap-2"
            onMouseLeave={() => setHoverRating(null)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
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
              {hoverRating ? `${hoverRating}/5` : (rating ? `${rating}/5` : "Select a rating")}
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

        {/* Lists (Tags) */}
        <div className="space-y-2">
          <label className="text-sm font-medium uppercase text-muted-foreground">Lists</label>
          <AutocompleteTagInput
            tags={tags}
            setTags={setTags}
            suggestions={suggestions}
            placeholder="Add to list..."
            normalize={(v) => v.trim()}
          />
        </div>

        {/* Resources & Links */}
        <div className="space-y-4">
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
                        <Link className="w-4 h-4 text-muted-foreground" />
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

        {/* Image Upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium uppercase text-muted-foreground">Photos</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Add Photos
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              disabled={submitting}
            />
          </div>

          {images.length > 0 && (
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
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex justify-end gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitting ? "Publishing..." : "Publish Review"}
          </Button>
        </div>

      </div>
    </AppLayout>
  );
}
