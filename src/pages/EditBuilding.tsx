import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildingForm, BuildingFormData } from "@/components/BuildingForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditBuilding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<BuildingFormData | null>(null);

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

      // Check permission: creator or admin
      // Since we don't have a reliable client-side admin check in the schema yet,
      // and RLS policies likely handle the hard enforcement, we will use a soft check for UX.
      // If user is not creator, we'll try to check if they are an admin via a profile lookup if possible,
      // otherwise we default to blocking the UI to avoid confusion.

      let hasPermission = data.created_by === user?.id;

      if (!hasPermission) {
         // Check if user has an admin role
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

    } catch (error) {
      console.error(error);
      toast.error("Error loading building");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: BuildingFormData) => {
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
          main_image_url: formData.main_image_url
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

  if (!initialValues) return null;

  return (
    <AppLayout title="Edit Building" showBack>
      <div className="max-w-2xl mx-auto p-4">
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
