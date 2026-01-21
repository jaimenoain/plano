import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { AutocompleteTagInput } from "@/components/ui/autocomplete-tag-input";
import { supabase } from "@/integrations/supabase/client";
import { buildingSchema } from "@/lib/validations/building";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

const ARCHITECTURAL_STYLES = [
  "Brutalist",
  "Bauhaus",
  "Gothic",
  "Modernist",
  "Art Deco",
  "Neoclassical",
  "Contemporary",
  "Industrial",
];

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialValues.main_image_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combine loading states
  const isSubmitting = parentIsSubmitting || isUploading;

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== initialValues.main_image_url) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, initialValues.main_image_url]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(initialValues.main_image_url);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const rawData = {
        name,
        year_completed,
        architects,
        styles,
        description,
        main_image_url: finalImageUrl,
      };

      const validationResult = buildingSchema.safeParse(rawData);

      if (!validationResult.success) {
        validationResult.error.errors.forEach((err) => {
          toast.error(err.message);
        });
        setIsUploading(false);
        return;
      }

      // Ensure types match BuildingFormData
      const formData: BuildingFormData = {
        ...validationResult.data,
        main_image_url: validationResult.data.main_image_url ?? null,
      };

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
        <AutocompleteTagInput
          tags={styles}
          setTags={setStyles}
          suggestions={ARCHITECTURAL_STYLES}
          placeholder="Type to search or add style..."
        />
        <p className="text-xs text-muted-foreground">
          Select from list or type to add custom style.
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
          {previewUrl ? (
            <div className="relative w-fit">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-48 w-auto object-cover rounded-md border"
              />
              {imageFile && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="h-32 w-full border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground bg-muted/10">
              No image selected
            </div>
          )}

          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
          </div>
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
