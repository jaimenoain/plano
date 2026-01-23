import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { BuildingForm, BuildingFormData } from "./BuildingForm";
import { useAuth } from "@/hooks/useAuth";
import { RecommendDialog } from "@/components/common/RecommendDialog";

interface AddBuildingDetailsProps {
  locationData: {
    lat: number;
    lng: number;
    address: string;
    name?: string;
    city?: string | null;
    country?: string | null;
  };
  onBack: () => void;
}

export function AddBuildingDetails({ locationData, onBack }: AddBuildingDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [newBuilding, setNewBuilding] = useState<{ id: string; name: string } | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFormSubmit = async (data: BuildingFormData) => {
    if (!user) {
      toast.error("You must be logged in to add a building");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Prepare data for legacy column support
      const architectNames = data.architects.map(a => a.name);

      // 2. Insert Building
      // @ts-ignore - Supabase types might be strict on PostGIS or specific columns
      const { data: insertedData, error } = await supabase
        .from('films')
        .insert({
          name: data.name,
          year_completed: data.year_completed,
          description: data.description,
          poster_path: data.main_image_url, // Legacy mapping

          // Location Data (Merged from Main & Feature branches)
          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          // PostGIS point format "POINT(lng lat)"
          location: `POINT(${locationData.lng} ${locationData.lat})`,

          created_by: user.id,
          styles: data.styles,
          architects: architectNames // Maintain legacy array of strings
        })
        .select()
        .single();

      if (error) throw error;

      const buildingId = insertedData.id;

      // 3. Insert Architect Links (Junction Table Logic)
      if (data.architects.length > 0) {
          try {
            const links = data.architects.map(a => ({
                building_id: buildingId,
                architect_id: a.id
            }));

            // @ts-ignore - junction table created in migration
            const { error: linkError } = await supabase
                .from('building_architects')
                .insert(links);

            if (linkError) {
                console.warn("Error linking architects (table might be missing):", linkError);
                // Non-fatal error, but warn the user
                // toast.error("Building saved, but failed to link architects.");
            }
          } catch (err) {
              console.warn("Failed to insert building_architects, likely missing table", err);
          }
      }

      // 4. Success State
      toast.success("Building added successfully!");
      setNewBuilding({ id: insertedData.id, name: insertedData.name });
      setShowVisitDialog(true);

    } catch (error) {
      console.error("Error adding building:", error);
      toast.error("Failed to save building.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialValues: BuildingFormData = {
    name: locationData.name || "",
    year_completed: null,
    architects: [],
    styles: [],
    description: "",
    main_image_url: null,
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
            Tell us more about {locationData.name || locationData.address}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BuildingForm
            initialValues={initialValues}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Save Building"
          />
        </CardContent>
      </Card>

      {newBuilding && (
        <RecommendDialog
            open={showVisitDialog}
            onOpenChange={(open) => {
                setShowVisitDialog(open);
                if (!open && newBuilding) {
                    navigate(`/building/${newBuilding.id}`);
                }
            }}
            building={newBuilding}
            mode="visit_with"
        />
      )}
    </div>
  );
}