import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArchitectSelect, Architect as SelectArchitect } from "@/components/ui/architect-select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useArchitect } from "@/hooks/useArchitect";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["individual", "studio"]),
  headquarters: z.string().optional().nullable(),
  website_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  bio: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditArchitect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { architect, loading: architectLoading, error } = useArchitect(id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Affiliations State
  const [affiliations, setAffiliations] = useState<SelectArchitect[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingAffiliations, setIsLoadingAffiliations] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "individual",
      headquarters: "",
      website_url: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("You must be logged in to edit");
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (architect) {
      form.reset({
        name: architect.name,
        type: architect.type,
        headquarters: architect.headquarters || "",
        website_url: architect.website_url || "",
        bio: architect.bio || "",
      });
    }
  }, [architect, form]);

  useEffect(() => {
    if (!id || !architect) return;

    const fetchAffiliations = async () => {
        setIsLoadingAffiliations(true);
        try {
            if (architect.type === 'individual') {
                // Fetch studios this individual belongs to
                const { data, error } = await supabase
                    .from('architect_affiliations')
                    .select('studio:architects!architect_affiliations_studio_id_fkey(id, name, type)')
                    .eq('individual_id', id);

                if (error) throw error;
                // @ts-ignore
                setAffiliations(data.map(d => d.studio).filter(Boolean));
            } else {
                // Fetch individuals that belong to this studio
                const { data, error } = await supabase
                    .from('architect_affiliations')
                    .select('individual:architects!architect_affiliations_individual_id_fkey(id, name, type)')
                    .eq('studio_id', id);

                if (error) throw error;
                // @ts-ignore
                setAffiliations(data.map(d => d.individual).filter(Boolean));
            }
        } catch (e) {
            console.error("Error fetching affiliations", e);
        } finally {
            setIsLoadingAffiliations(false);
        }
    };

    fetchAffiliations();
  }, [id, architect]);

  const onSubmit = async (values: FormValues) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      // @ts-ignore
      const { error } = await supabase
        .from("architects")
        .update({
          name: values.name,
          type: values.type,
          headquarters: values.headquarters || null,
          website_url: values.website_url || null,
          bio: values.bio || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Architect updated successfully");
      navigate(`/architect/${id}`);
    } catch (error) {
      console.error("Error updating architect:", error);
      toast.error("Failed to update architect");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAffiliationsChange = async (newAffiliations: SelectArchitect[]) => {
    if (!id || !architect) return;

    // Determine added and removed
    const added = newAffiliations.filter(n => !affiliations.some(e => e.id === n.id));
    const removed = affiliations.filter(e => !newAffiliations.some(n => n.id === e.id));

    // Update State Optimistically
    setAffiliations(newAffiliations);

    try {
        if (added.length > 0) {
            const records = added.map(a => ({
                studio_id: architect.type === 'individual' ? a.id : id,
                individual_id: architect.type === 'individual' ? id : a.id
            }));
            const { error } = await supabase.from('architect_affiliations').insert(records);
            if (error) throw error;
        }

        if (removed.length > 0) {
            const removedIds = removed.map(r => r.id);
            // If individual, we are removing studios where individual_id = id AND studio_id IN removedIds
            // If studio, we are removing individuals where studio_id = id AND individual_id IN removedIds

            let query = supabase.from('architect_affiliations').delete();

            if (architect.type === 'individual') {
                query = query.eq('individual_id', id).in('studio_id', removedIds);
            } else {
                query = query.eq('studio_id', id).in('individual_id', removedIds);
            }

            const { error } = await query;

            if (error) throw error;
        }
    } catch (e) {
        console.error("Error updating affiliations", e);
        toast.error("Failed to update affiliations");
        // Revert state?
        // We'll leave it for now as a simple implementation
    }
  };

  if (authLoading || architectLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !architect) {
     return (
      <AppLayout showBack>
        <div className="px-4 py-6 text-center">
          <h1 className="text-2xl font-bold">Architect not found</h1>
          <Button onClick={() => navigate("/")} className="mt-4">Return Home</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack title="Edit Architect">
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Edit Architect Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Architect Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="headquarters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headquarters / Location</FormLabel>
                      <FormControl>
                        <Input
                            placeholder="e.g. London, UK"
                            {...field}
                            value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                            placeholder="https://example.com"
                            {...field}
                            value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio / Description</FormLabel>
                      <FormControl>
                        <Textarea
                            placeholder="Tell us about this architect..."
                            className="min-h-[120px]"
                            {...field}
                            value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {architect.type === 'individual' ? 'Member of Studios' : 'Team Members'}
                  </h3>
                  <ArchitectSelect
                     selectedArchitects={affiliations}
                     setSelectedArchitects={handleAffiliationsChange}
                     filterType={architect.type === 'individual' ? 'studio' : 'individual'}
                     placeholder={architect.type === 'individual' ? 'Search studios...' : 'Search architects...'}
                  />
                  <p className="text-sm text-muted-foreground">
                    {architect.type === 'individual'
                       ? "Search for studios this architect is associated with."
                       : "Search for individual architects that are part of this studio."}
                  </p>
                </div>

                <Separator className="my-6" />

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/architect/${id}`)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
