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
      const { data: insertedData, error } = await supabase
        .from('buildings')
        .insert({
          name: data.name,
          year_completed: data.year_completed,
          main_image_url: data.main_image_url,

          // Location Data (Merged from Main & Feature branches)
          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          // PostGIS point format "POINT(lng lat)"
          location: `POINT(${locationData.lng} ${locationData.lat})`,

          created_by: user.id,
          // @ts-ignore: New columns might not be in generated types yet
          functional_category_id: data.functional_category_id,
          // @ts-ignore
          functional_typology_ids: data.functional_typology_ids,
          // @ts-ignore
          selected_attribute_ids: data.selected_attribute_ids,
          architects: architectNames // Maintain legacy array of strings
        })
        .select()
        .single();

      if (error) throw error;

      const buildingId = insertedData.id;

      // 3. Insert User Building (Auto-add to creator's list)
      try {
        const { error: userBuildingError } = await supabase
          .from('user_buildings')
          .insert({
            user_id: user.id,
            building_id: buildingId,
            status: 'visited',
            created_at: new Date().toISOString()
          });

        if (userBuildingError) {
          console.warn("Failed to auto-add to user list", userBuildingError);
        }
      } catch (err) {
        console.warn("Exception auto-adding to user list", err);
      }

      // 4. Insert Architect Links (Junction Table Logic)
      if (data.architects.length > 0) {
          try {
            const links = data.architects.map(a => ({
                building_id: buildingId,
                architect_id: a.id
            }));

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

      // 5. Success State
      toast.success("Building added successfully!");
      setNewBuilding({ id: insertedData.id, name: insertedData.name });
      setShowVisitDialog(true);

    } catch (error: any) {
      console.error("Error adding building:", error);
      toast.error(`Failed to save building: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialValues: BuildingFormData = {
    name: locationData.name || "",
    year_completed: null,
    architects: [],
    functional_category_id: "",
    functional_typology_ids: [],
    selected_attribute_ids: [],
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