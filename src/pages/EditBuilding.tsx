import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildingForm, BuildingFormData } from "@/components/BuildingForm";
import { BuildingLocationPicker } from "@/components/BuildingLocationPicker";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Architect } from "@/components/ui/architect-select";
import { parseLocation } from "@/utils/location";

interface LocationData {
    lat: number | null;
    lng: number | null;
    address: string;
    city: string | null;
    country: string | null;
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

  useEffect(() => {
    if (id && user) {
      fetchBuilding();
    }
  }, [id, user]);

  const fetchBuilding = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast.error("Building not found");
        navigate('/');
        return;
      }

      if (!data) {
          navigate('/');
          return;
      }

      // Permission Check
      let hasPermission = data.created_by === user?.id;
      if (!hasPermission) {
         const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id)
            .single();

         if (profile && profile.role === 'admin') {
             hasPermission = true;
         }
      }

      if (!hasPermission) {
          toast.error("You don't have permission to edit this building.");
          navigate(`/building/${id}`);
          return;
      }

      // Fetch Relations
      // Architects
      // @ts-ignore
      const { data: relations } = await supabase
        .from('building_architects')
        .select('architect:architects(id, name, type)')
        .eq('building_id', id);

      const relationArchitects = relations?.map((r: any) => r.architect) || [];

      let finalArchitects: Architect[] = [];
      if (relationArchitects.length > 0) {
          finalArchitects = relationArchitects;
      } else if (data.architects && data.architects.length > 0) {
          // Legacy fallback
          finalArchitects = data.architects.map((name: string) => ({
              id: name, // Use name as ID for legacy (handled in submit)
              name: name,
              type: 'individual'
          }));
      }

      // Fetch Typologies
      // @ts-ignore
      const { data: typologies } = await supabase
        .from('building_functional_typologies')
        .select('typology_id')
        .eq('building_id', id);

      const typologyIds = typologies?.map((t: any) => t.typology_id) || [];

      // Fetch Attributes
      // @ts-ignore
      const { data: attributes } = await supabase
        .from('building_attributes')
        .select('attribute_id')
        .eq('building_id', id);

      const attributeIds = attributes?.map((a: any) => a.attribute_id) || [];


      setInitialValues({
        name: data.name,
        year_completed: data.year_completed,
        architects: finalArchitects,
        functional_category_id: (data as any).functional_category_id || "",
        functional_typology_ids: typologyIds,
        selected_attribute_ids: attributeIds,
        main_image_url: data.main_image_url,
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
          country: data.country
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
    if (!locationData || !id) return;
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

        const others = (data || []).filter((b: any) => b.id !== id);
        setDuplicates(others);

      } catch (error) {
        console.error("Error checking duplicates:", error);
      } finally {
        setCheckingDuplicates(false);
      }
    };

    const timer = setTimeout(checkDuplicates, 800);
    return () => clearTimeout(timer);
  }, [locationData?.lat, locationData?.lng, id]);

  const handleSubmit = async (formData: BuildingFormData) => {
    if (!locationData) return;

    if (locationData.lat === null || locationData.lng === null) {
        toast.error("Please ensure the location is set on the map");
        return;
    }

    setIsSubmitting(true);

    try {
      const architectNames = formData.architects.map(a => a.name);

      const { error } = await supabase
        .from('buildings')
        .update({
          name: formData.name,
          year_completed: formData.year_completed,
          architects: architectNames, // Maintain legacy array
          // @ts-ignore
          functional_category_id: formData.functional_category_id,
          // Removed legacy column updates for typologies/attributes
          main_image_url: formData.main_image_url,

          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          location: `POINT(${locationData.lng} ${locationData.lat})` as unknown
        })
        .eq('id', id);

      if (error) {
        console.error("Update error:", error);
        toast.error("Failed to update building");
        setIsSubmitting(false);
        return;
      }

      // Handle Architects Junction Table
      // 1. Resolve IDs for all architects
      const resolvedIds: string[] = [];

      for (const arch of formData.architects) {
          if (isUUID(arch.id)) {
              resolvedIds.push(arch.id);
          } else {
              // Legacy or Name-as-ID: Try to find or create
              // @ts-ignore
              const { data: existing } = await supabase.from('architects').select('id').eq('name', arch.name).maybeSingle();
              if (existing) {
                  resolvedIds.push(existing.id);
              } else {
                  // Create
                  // @ts-ignore
                  const { data: newArch, error: createError } = await supabase
                    .from('architects')
                    .insert({ name: arch.name, type: 'individual' })
                    .select('id')
                    .single();

                  if (newArch) resolvedIds.push(newArch.id);
                  if (createError) console.error("Error creating architect on save:", createError);
              }
          }
      }

      // 2. Clear existing links
      // @ts-ignore
      await supabase.from('building_architects').delete().eq('building_id', id);

      // 3. Insert new links
      if (resolvedIds.length > 0) {
          const links = resolvedIds.map(aId => ({ building_id: id, architect_id: aId }));
          // @ts-ignore
          const { error: linkError } = await supabase.from('building_architects').insert(links);
          if (linkError) console.error("Link error:", linkError);
      }

      // Handle Typologies Junction Table
      // @ts-ignore
      await supabase.from('building_functional_typologies').delete().eq('building_id', id);
      if (formData.functional_typology_ids.length > 0) {
          const tLinks = formData.functional_typology_ids.map(tid => ({ building_id: id, typology_id: tid }));
          // @ts-ignore
          const { error: tError } = await supabase.from('building_functional_typologies').insert(tLinks);
          if (tError) console.error("Typology link error:", tError);
      }

      // Handle Attributes Junction Table
      // @ts-ignore
      await supabase.from('building_attributes').delete().eq('building_id', id);
      if (formData.selected_attribute_ids.length > 0) {
          const aLinks = formData.selected_attribute_ids.map(aid => ({ building_id: id, attribute_id: aid }));
          // @ts-ignore
          const { error: aError } = await supabase.from('building_attributes').insert(aLinks);
          if (aError) console.error("Attribute link error:", aError);
      }

      toast.success("Building updated successfully");
      navigate(`/building/${id}`);

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
                        address: locationData.address
                    }}
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
                            <ul className="list-disc pl-5 mt-2 text-sm">
                                {duplicates.slice(0, 3).map(d => (
                                    <li key={d.id}>
                                        {d.name} ({d.dist_meters.toFixed(0)}m away)
                                    </li>
                                ))}
                            </ul>
                            Please verify you aren't creating a duplicate.
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
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
