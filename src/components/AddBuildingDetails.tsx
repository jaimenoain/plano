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
      const architectNames = data.architects.map(a => a.name);

      // Insert Building
      // @ts-ignore - using buildings table
      const { data: insertedData, error } = await supabase
        .from('buildings')
        .insert({
          name: data.name,
          year_completed: data.year_completed,
          description: data.description,
          main_image_url: data.main_image_url,

          // Location Data
          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          // PostGIS point format "POINT(lng lat)"
          location: `POINT(${locationData.lng} ${locationData.lat})` as unknown,

          created_by: user.id,
          styles: data.styles,
          architects: architectNames // Maintain legacy array
        })
        .select()
        .single();

      if (error) throw error;

      const buildingId = insertedData.id;

      // Insert Architect Links
      if (data.architects.length > 0) {
          const links = data.architects.map(a => ({
              building_id: buildingId,
              architect_id: a.id
          }));

          // @ts-ignore - junction table created in migration
          const { error: linkError } = await supabase
            .from('building_architects')
            .insert(links);

          if (linkError) {
              console.error("Error linking architects:", linkError);
              // Non-fatal, but good to know
              toast.error("Building saved, but failed to link architects.");
          }
      }

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
