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
