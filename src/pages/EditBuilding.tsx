import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BuildingForm, BuildingFormData } from "@/components/BuildingForm";
import { BuildingLocationPicker } from "@/components/BuildingLocationPicker";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Architect } from "@/components/ui/architect-select";
import { parseLocation } from "@/utils/location";
import { getBuildingUrl } from "@/utils/url";

interface LocationData {
    lat: number | null;
    lng: number | null;
    address: string;
    city: string | null;
    country: string | null;
    precision: 'exact' | 'approximate';
}

interface NearbyBuilding {
  id: string;
  name: string;
  address: string | null;
  location_lat: number;
  location_lng: number;
  dist_meters: number;
}

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default function EditBuilding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<BuildingFormData | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [duplicates, setDuplicates] = useState<NearbyBuilding[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingSlug, setBuildingSlug] = useState<string | null>(null);
  const [buildingShortId, setBuildingShortId] = useState<number | null>(null);

  useEffect(() => {
    if (id && user) {
      fetchBuilding();
    }
  }, [id, user]);

  const fetchBuilding = async () => {
    try {
      setLoading(true);

      let query = supabase.from('buildings').select('*');

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id!);
      if (isUUID) {
          query = query.eq('id', id);
      } else {
          query = query.eq('short_id', parseInt(id!));
      }

      const { data, error } = await query.single();

      if (error) {
        toast.error("Building not found");
        navigate('/');
        return;
      }

      if (!data) {
          navigate('/');
          return;
      }

      setBuildingId(data.id);
      // @ts-ignore
      setBuildingSlug(data.slug);
      // @ts-ignore
      setBuildingShortId(data.short_id);

      // Fetch Relations
      // Architects
      // @ts-ignore
      const { data: relations } = await supabase
        .from('building_architects')
        .select('architect:architects(id, name, type)')
        .eq('building_id', data.id);

      const relationArchitects = relations?.map((r: any) => r.architect) || [];

      const finalArchitects: Architect[] = relationArchitects;

      // Fetch Typologies
      // @ts-ignore
      const { data: typologies } = await supabase
        .from('building_functional_typologies')
        .select('typology_id')
        .eq('building_id', data.id);

      const typologyIds = typologies?.map((t: any) => t.typology_id) || [];

      // Fetch Attributes
      // @ts-ignore
      const { data: attributes } = await supabase
        .from('building_attributes')
        .select('attribute_id')
        .eq('building_id', data.id);

      const attributeIds = attributes?.map((a: any) => a.attribute_id) || [];


      setInitialValues({
        name: data.name,
        year_completed: data.year_completed,
        status: (data as any).status || "",
        access: (data as any).access || "",
        architects: finalArchitects,
        functional_category_id: (data as any).functional_category_id || "",
        functional_typology_ids: typologyIds,
        selected_attribute_ids: attributeIds,
      });

      // Parse location
      const coords = parseLocation(data.location);
      const lat = coords ? coords.lat : null;
      const lng = coords ? coords.lng : null;

      setLocationData({
          lat,
          lng,
          address: data.address || "",
          city: data.city,
          country: data.country,
          // @ts-ignore: location_precision is a new column
          precision: data.location_precision || 'exact'
      });

    } catch (error) {
      console.error(error);
      toast.error("Error loading building");
    } finally {
      setLoading(false);
    }
  };

  // Duplicate Check Effect
  useEffect(() => {
    if (!locationData || !buildingId) return;
    if (locationData.lat === null || locationData.lng === null) return;

    const checkDuplicates = async () => {
      setCheckingDuplicates(true);
      try {
        const { data, error } = await supabase.rpc('find_nearby_buildings', {
          lat: locationData.lat,
          long: locationData.lng,
          radius_meters: 50,
          name_query: initialValues?.name || ""
        });

        if (error) throw error;

        const others = (data || []).filter((b: any) => b.id !== buildingId);
        setDuplicates(others);

      } catch (error) {
        console.error("Error checking duplicates:", error);
      } finally {
        setCheckingDuplicates(false);
      }
    };

    const timer = setTimeout(checkDuplicates, 800);
    return () => clearTimeout(timer);
  }, [locationData?.lat, locationData?.lng, buildingId]);

  const handleSubmit = async (formData: BuildingFormData) => {
    if (!locationData || !buildingId) return;

    if (locationData.lat === null || locationData.lng === null) {
        toast.error("Please ensure the location is set on the map");
        return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('buildings')
        .update({
          name: formData.name,
          year_completed: formData.year_completed,
          status: formData.status as any,
          access: formData.access as any,
          // @ts-ignore
          functional_category_id: formData.functional_category_id,
          // Removed legacy column updates for typologies/attributes

          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          location: `POINT(${locationData.lng} ${locationData.lat})` as unknown,
          // @ts-ignore: location_precision is a new column
          location_precision: locationData.precision
        })
        .eq('id', buildingId);

      if (error) {
        console.error("Update error:", error);
        toast.error("Failed to update building");
        setIsSubmitting(false);
        return;
      }

      // Handle Architects Junction Table
      // 1. Clear existing links
      // @ts-ignore
      await supabase.from('building_architects').delete().eq('building_id', buildingId);

      // 2. Insert new links
      // We assume formData.architects contains valid UUIDs from the ArchitectSelect component
      if (formData.architects.length > 0) {
          const links = formData.architects.map(a => ({ building_id: buildingId, architect_id: a.id }));
          // @ts-ignore
          const { error: linkError } = await supabase.from('building_architects').insert(links);
          if (linkError) console.error("Link error:", linkError);
      }

      // Handle Typologies Junction Table
      // @ts-ignore
      await supabase.from('building_functional_typologies').delete().eq('building_id', buildingId);
      if (formData.functional_typology_ids.length > 0) {
          const tLinks = formData.functional_typology_ids.map(tid => ({ building_id: buildingId, typology_id: tid }));
          // @ts-ignore
          const { error: tError } = await supabase.from('building_functional_typologies').insert(tLinks);
          if (tError) console.error("Typology link error:", tError);
      }

      // Handle Attributes Junction Table
      // @ts-ignore
      await supabase.from('building_attributes').delete().eq('building_id', buildingId);
      if (formData.selected_attribute_ids.length > 0) {
          const aLinks = formData.selected_attribute_ids.map(aid => ({ building_id: buildingId, attribute_id: aid }));
          // @ts-ignore
          const { error: aError } = await supabase.from('building_attributes').insert(aLinks);
          if (aError) console.error("Attribute link error:", aError);
      }

      toast.success("Building updated successfully");
      navigate(getBuildingUrl(buildingId, buildingSlug, buildingShortId));

    } catch (error) {
      console.error(error);
      toast.error("Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!initialValues || !locationData) return null;

  return (
    <AppLayout title="Edit Building" showBack>
      <div className="max-w-4xl mx-auto p-4 space-y-6">

        {/* Location Section */}
        <Card>
            <CardHeader>
                <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
                <BuildingLocationPicker
                    initialLocation={{
                        lat: locationData.lat,
                        lng: locationData.lng,
                        address: locationData.address,
                        city: locationData.city,
                        country: locationData.country
                    }}
                    initialPrecision={locationData.precision}
                    onLocationChange={(newLoc) => setLocationData({
                        ...newLoc
                    })}
                />

                {duplicates.length > 0 && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive mt-4">
                        <div className="flex items-center gap-2 font-medium mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            Potential Duplicates Found
                        </div>
                        <div className="text-sm opacity-90">
                            Changing the location here puts it very close to these existing buildings:
                            <ul className="mt-2 space-y-2">
                                {duplicates.slice(0, 3).map(d => (
                                    <li key={d.id} className="flex items-center justify-between gap-2 bg-white/50 p-2 rounded text-sm">
                                        <span>{d.name} ({d.dist_meters.toFixed(0)}m away)</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs border-destructive/50 text-destructive hover:bg-destructive hover:text-white"
                                            onClick={() => navigate(`/admin/merge/${buildingId}/${d.id}`)}
                                            type="button"
                                        >
                                            Review Duplicate
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-2">Please verify you aren't creating a duplicate.</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Building Details</CardTitle>
          </CardHeader>
          <CardContent>
            <BuildingForm
              initialValues={initialValues}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Update Building"
              mode="edit"
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
