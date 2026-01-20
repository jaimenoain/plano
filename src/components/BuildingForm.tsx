import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface BuildingFormData {
  name: string;
  year_completed: number | null;
  architects: string[];
  styles: string[];
  description: string;
  main_image_url: string | null;
}

interface BuildingFormProps {
  initialValues: BuildingFormData;
  onSubmit: (data: BuildingFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}

export function BuildingForm({ initialValues, onSubmit, isSubmitting: parentIsSubmitting, submitLabel }: BuildingFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [year_completed, setYear] = useState<string>(initialValues.year_completed?.toString() || "");
  const [architects, setArchitects] = useState<string[]>(initialValues.architects);
  const [styles, setStyles] = useState<string[]>(initialValues.styles);
  const [description, setDescription] = useState(initialValues.description);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Combine loading states
  const isSubmitting = parentIsSubmitting || isUploading;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Building name is required");
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = initialValues.main_image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to 'building-images' bucket
        const { error: uploadError } = await supabase.storage
          .from('building-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Failed to upload image. Please try again.");
          setIsUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('building-images')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const formData: BuildingFormData = {
        name,
        year_completed: year_completed ? parseInt(year_completed) : null,
        architects,
        styles,
        description,
        main_image_url: finalImageUrl,
      };

      // We await the parent submit. The parent handles its own isSubmitting state,
      // but we also keep isUploading true until this finishes to be safe,
      // or we rely on parentIsSubmitting which should be true by now if we passed it correctly?
      // Actually, we are calling `await onSubmit`.
      // The parent sets `isSubmitting` to true inside `onSubmit`.
      // So `parentIsSubmitting` will become true.
      // We can turn off `isUploading` after `onSubmit` returns (or if it throws).

      await onSubmit(formData);

    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sydney Opera House"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="year_completed">Year Built</Label>
        <Input
          id="year_completed"
          type="number"
          value={year_completed}
          onChange={(e) => setYear(e.target.value)}
          placeholder="e.g. 1973"
        />
      </div>

      <div className="space-y-2">
        <Label>Architects</Label>
        <TagInput
          tags={architects}
          setTags={setArchitects}
          placeholder="Type and press Enter to add architect..."
        />
        <p className="text-xs text-muted-foreground">
          Add multiple architects if applicable.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Architectural Styles</Label>
        <TagInput
          tags={styles}
          setTags={setStyles}
          placeholder="Type and press Enter to add style..."
        />
        <p className="text-xs text-muted-foreground">
          e.g. Modernist, Expressionist, Brutalist
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the building..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Image</Label>
        <div className="space-y-2">
            {initialValues.main_image_url && !imageFile && (
                <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Current Image:</p>
                    <img src={initialValues.main_image_url} alt="Current" className="h-32 w-auto object-cover rounded-md border" />
                </div>
            )}
            <div className="flex items-center gap-4">
                <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
                />
            </div>
            {imageFile && (
                <p className="text-sm text-muted-foreground">
                Selected: {imageFile.name}
                </p>
            )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
