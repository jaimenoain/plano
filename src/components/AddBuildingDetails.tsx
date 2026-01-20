import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TagInput } from "@/components/ui/tag-input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AddBuildingDetailsProps {
  locationData: {
    lat: number;
    lng: number;
    address: string;
  };
  onBack: () => void;
}

export function AddBuildingDetails({ locationData, onBack }: AddBuildingDetailsProps) {
  const [name, setName] = useState("");
  const [year, setYear] = useState<string>("");
  const [architects, setArchitects] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Attempt to upload
        const { error: uploadError } = await supabase.storage
          .from('building_images')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          // If error is bucket not found, we can try to create it, but usually we can't from client.
          // We will just report error.
          toast.error("Failed to upload image. Please try again.");
          setIsSubmitting(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('building_images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('buildings')
        .insert({
          name,
          year: year ? parseInt(year) : null,
          architects,
          styles,
          address: locationData.address,
          image_url: imageUrl,
          // location is a geography(POINT) column. We need to pass a string "POINT(lng lat)"
          // Cast to unknown to bypass strict type check if needed, but Supabase client handles strings for geography often.
          location: `POINT(${locationData.lng} ${locationData.lat})` as unknown
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error:", error);
        toast.error("Failed to save building.");
      } else {
        toast.success("Building added successfully!");
        navigate(`/building/${data.id}`);
      }

    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add Details</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Building Information</CardTitle>
          <CardDescription>
            Tell us more about {locationData.address}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="year">Year Built</Label>
              <Input
                id="year"
                type="number"
                value={year}
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
              <Label htmlFor="image">Image</Label>
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Building"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
