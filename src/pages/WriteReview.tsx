// Implements "Write Review" page with rating, text, and image upload
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Star, Upload, X, Loader2, ImagePlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { resizeImage } from "@/lib/image-compression";

interface ReviewImage {
  id: string;
  file: File;
  preview: string;
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

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [images, setImages] = useState<ReviewImage[]>([]);
  const [existingStatus, setExistingStatus] = useState<'visited' | 'pending' | 'ignored' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;

        // 1. Fetch Building Name
        const { data: building, error: buildingError } = await supabase
          .from("buildings")
          .select("name")
          .eq("id", id)
          .single();

        if (buildingError) throw buildingError;
        setBuildingName(building.name);

        // 2. Fetch Existing Review/Status
        if (user) {
          const { data: userBuilding, error: ubError } = await supabase
            .from("user_buildings")
            .select("rating, content, status")
            .eq("user_id", user.id)
            .eq("building_id", id)
            .maybeSingle();

          if (ubError) throw ubError;

          if (userBuilding) {
            if (userBuilding.rating) setRating(userBuilding.rating);
            if (userBuilding.content) setContent(userBuilding.content);
            setExistingStatus(userBuilding.status);
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
      // Revoke object URL to avoid memory leaks
      const removed = prev.find(img => img.id === imageId);
      if (removed) URL.revokeObjectURL(removed.preview);
      return newImages;
    });
  };

  const handleSubmit = async () => {
    if (!user || !id) return;
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
          building_id: id,
          rating: rating,
          content: content,
          status: statusToUse,
          edited_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' })
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (!userBuilding) throw new Error("Failed to save review");

      const reviewId = userBuilding.id;

      // 2. Upload Images
      if (images.length > 0) {
        const uploadPromises = images.map(async (img) => {
          const fileExt = "webp"; // We know we compressed to webp (mostly)
          const fileName = `${user.id}/${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('review_images')
            .upload(fileName, img.file);

          if (uploadError) throw uploadError;

          // 3. Insert Image Record
          const { error: insertError } = await supabase
            .from('review_images')
            .insert({
              review_id: reviewId,
              user_id: user.id,
              storage_path: fileName
            });

          if (insertError) throw insertError;
        });

        await Promise.all(uploadPromises);
      }

      toast({ title: "Review published!" });
      navigate(`/building/${id}`);

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
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium uppercase text-muted-foreground">Rating</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating ?? rating)
                      ? "fill-primary text-primary"
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
