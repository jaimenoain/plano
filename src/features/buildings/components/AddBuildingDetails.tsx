import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BuildingPageHeader } from "@/features/buildings/components/building-form-ui";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { BuildingForm, BuildingFormData } from "./BuildingForm";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { replacePrimaryDesignCredits } from "@/features/credits/api/credits";
import { getBuildingUrl } from "@/utils/url";
import type { Database } from "@/integrations/supabase/types";

type BuildingEnums = Database["public"]["Enums"];

interface AddBuildingDetailsProps {
  locationData: {
    lat: number;
    lng: number;
    address: string;
    name?: string;
    city?: string | null;
    country?: string | null;
    countryCode?: string | null;
    precision?: 'exact' | 'approximate';
  };
  onBack: () => void;
}

export function AddBuildingDetails({ locationData, onBack }: AddBuildingDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFormSubmit = async (formData: BuildingFormData) => {
    if (!user) {
      toast.error("You must be logged in to add a building");
      return;
    }

    setIsSubmitting(true);

    let insertedData: { id: string; slug: string | null; short_id: number | null } | null = null;
    try {
      // 1. Insert Building (hard-fail: if this errors the rest is skipped)
      const { data, error } = await supabase
        .from('buildings')
        .insert({
          name: formData.name,
          slug: formData.slug ?? undefined,
          alt_name: formData.alt_name || null,
          aliases: formData.aliases || [],
          century: formData.century ?? null,
          year_completed: formData.year_completed,
          status: (formData.status || null) as BuildingEnums["building_status"] | null,
          access_level: (formData.access_level || null) as BuildingEnums["building_access_level"] | null,
          access_logistics: (formData.access_logistics || null) as BuildingEnums["building_access_logistics"] | null,
          access_cost: (formData.access_cost || null) as BuildingEnums["building_access_cost"] | null,
          access_notes: formData.access_notes || null,
          architect_statement: formData.architect_statement || null,
          size_category: formData.size_category || null,
          size_sqm: formData.size_sqm ?? null,
          height_m: formData.height_m ?? null,
          storeys: formData.storeys ?? null,

          // Location Data (Merged from Main & Feature branches)
          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          country_code: locationData.countryCode ?? null,
          // PostGIS point format "POINT(lng lat)"
          location: `POINT(${locationData.lng} ${locationData.lat})`,
          location_precision: locationData.precision || 'exact',

          created_by: user.id,
          functional_category_id: formData.functional_category_id,
        })
        .select('id, slug, short_id')
        .single();

      if (error) throw error;
      insertedData = data;
    } catch (error: unknown) {
      toast.error(`Failed to save building: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsSubmitting(false);
      return;
    }

    const buildingId = insertedData.id;

    // 2. Auto-add to creator's list (best-effort; non-blocking)
    try {
      await supabase
        .from('user_buildings')
        .insert({
          user_id: user.id,
          building_id: buildingId,
          status: 'visited',
          created_at: new Date().toISOString()
        });
    } catch (_err) {
      void _err;
    }

    // 3. Primary design credits — surface failures so credits aren't silently dropped
    if (formData.designCreditEntities.length > 0) {
      try {
        await replacePrimaryDesignCredits(
          buildingId,
          [],
          formData.designCreditEntities.map((e) => ({ kind: e.kind, id: e.id })),
        );
      } catch (err: unknown) {
        toast.error(`Building saved, but design credits could not be added: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // 4. Typologies (junction table)
    if (formData.functional_typology_ids.length > 0) {
      const typologyLinks = formData.functional_typology_ids.map(tId => ({
        building_id: buildingId,
        typology_id: tId
      }));

      const { error: typoError } = await supabase
        .from('building_functional_typologies')
        .insert(typologyLinks);

      if (typoError) {
        toast.error(`Building saved, but typologies could not be added: ${typoError.message}`);
      }
    }

    // 5. Attributes (junction table)
    if (formData.selected_attribute_ids.length > 0) {
      const attributeLinks = formData.selected_attribute_ids.map(aId => ({
        building_id: buildingId,
        attribute_id: aId
      }));

      const { error: attrError } = await supabase
        .from('building_attributes')
        .insert(attributeLinks);

      if (attrError) {
        toast.error(`Building saved, but attributes could not be added: ${attrError.message}`);
      }
    }

    toast.success("Building added successfully!");
    // Locality URL not available: insert response does not include locality_country_code/city_slug — requires buildings INSERT to return locality join or a separate lookup
    navigate(getBuildingUrl(insertedData.id, insertedData.slug, insertedData.short_id));
    setIsSubmitting(false);
  };

  const initialValues: BuildingFormData = {
    name: locationData.name || "",
    alt_name: "",
    aliases: [],
    year_completed: null,
    status: null,
    access_level: null,
    access_logistics: null,
    access_cost: null,
    access_notes: null,
    designCreditEntities: [],
    functional_category_id: "",
    functional_typology_ids: [],
    selected_attribute_ids: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to location">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <BuildingPageHeader
          eyebrow="Step 2"
          title="Building details"
          description={`Tell us more about ${locationData.name || locationData.address}.`}
        />
      </div>

      <BuildingForm
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Save Building"
        mode="create"
      />
    </div>
  );
}
