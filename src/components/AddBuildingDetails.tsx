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
    precision?: 'exact' | 'approximate';
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
      // 2. Insert Building
      const { data: insertedData, error } = await supabase
        .from('buildings')
        .insert({
          name: data.name,
          year_completed: data.year_completed,

          // Location Data (Merged from Main & Feature branches)
          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          // PostGIS point format "POINT(lng lat)"
          location: `POINT(${locationData.lng} ${locationData.lat})`,
          // @ts-ignore
          location_precision: locationData.precision || 'exact',

          created_by: user.id,
          // @ts-ignore: New column functional_category_id
          functional_category_id: data.functional_category_id,
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

            // @ts-ignore
            const { error: linkError } = await supabase
                .from('building_architects')
                .insert(links);

            if (linkError) {
                console.warn("Error linking architects:", linkError);
            }
          } catch (err) {
              console.warn("Failed to insert building_architects", err);
          }
      }

      // 5. Insert Typologies (Junction Table)
      if (data.functional_typology_ids.length > 0) {
        try {
          const typologyLinks = data.functional_typology_ids.map(tId => ({
            building_id: buildingId,
            typology_id: tId
          }));

          // @ts-ignore
          const { error: typoError } = await supabase
            .from('building_functional_typologies')
            .insert(typologyLinks);

          if (typoError) console.error("Error linking typologies:", typoError);
        } catch (err) {
          console.error("Failed to insert typologies", err);
        }
      }

      // 6. Insert Attributes (Junction Table)
      if (data.selected_attribute_ids.length > 0) {
        try {
          const attributeLinks = data.selected_attribute_ids.map(aId => ({
            building_id: buildingId,
            attribute_id: aId
          }));

          // @ts-ignore
          const { error: attrError } = await supabase
            .from('building_attributes')
            .insert(attributeLinks);

          if (attrError) console.error("Error linking attributes:", attrError);
        } catch (err) {
          console.error("Failed to insert attributes", err);
        }
      }

      // 8. Insert Styles (Junction Table)
      if (data.styles && data.styles.length > 0) {
        try {
          const styleLinks = data.styles.map(s => ({
            building_id: buildingId,
            style_id: s.id
          }));

          // @ts-ignore
          const { error: styleError } = await supabase
            .from('building_styles')
            .insert(styleLinks);

          if (styleError) console.error("Error linking styles:", styleError);
        } catch (err) {
          console.error("Failed to insert styles", err);
        }
      }

      // 7. Success State
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
    styles: [],
    functional_category_id: "",
    functional_typology_ids: [],
    selected_attribute_ids: [],
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
