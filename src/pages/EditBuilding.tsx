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

interface LocationData {
    lat: number;
    lng: number;
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

      setInitialValues({
        name: data.name,
        year_completed: data.year_completed,
        architects: data.architects || [],
        styles: data.styles || [],
        description: data.description || "",
        main_image_url: data.main_image_url,
      });

      // Parse location
      let lat = 51.5074;
      let lng = -0.1278;

      if (data.location) {
        if (typeof data.location === 'string') {
            const matches = data.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
            if (matches) {
                lng = parseFloat(matches[1]);
                lat = parseFloat(matches[2]);
            }
        } else if (typeof data.location === 'object' && data.location.coordinates) {
             lng = data.location.coordinates[0];
             lat = data.location.coordinates[1];
        }
      }

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
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('buildings')
        .update({
          name: formData.name,
          year_completed: formData.year_completed,
          architects: formData.architects,
          styles: formData.styles,
          description: formData.description,
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
      } else {
        toast.success("Building updated successfully");
        navigate(`/building/${id}`);
      }
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
