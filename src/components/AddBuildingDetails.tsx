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
      // We merge the form data (data) with the location data (locationData) which is passed as a prop
      // This ensures that city and country (extracted from the map/geocoder) are persisted.

      const { data: insertedData, error } = await supabase
        .from('buildings')
        .insert({
          name: data.name,
          year_completed: data.year_completed,
          description: data.description,
          main_image_url: data.main_image_url,
          // Use location data
          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          // PostGIS Point format: POINT(lng lat)
          // Types might expect unknown or specific GeoJSON, but PostgREST accepts WKT
          // @ts-ignore - Supabase types are strict on unknown
          location: `POINT(${locationData.lng} ${locationData.lat})`,
          architects: data.architects,
          styles: data.styles,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error("Insert error:", error);
        toast.error("Failed to save building.");
      } else {
        toast.success("Building added successfully!");
        setNewBuilding({ id: insertedData.id, name: insertedData.name });
        setShowVisitDialog(true);
      }

    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred.");
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
