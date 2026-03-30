import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface ClaimProfileDialogProps {
  architectId: string;
  architectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  professional_email: z.string().email({
    message: "Please enter a valid professional email address.",
  }),
});

export function ClaimProfileDialog({
  architectId,
  architectName,
  open,
  onOpenChange,
  onSuccess,
}: ClaimProfileDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      professional_email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // @ts-expect-error - architect_claims table exists in migration
      const { error } = await supabase.from("architect_claims").insert({
        user_id: user.id,
        architect_id: architectId,
        proof_email: values.professional_email,
        status: "pending",
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        // Reset state after closing
        setTimeout(() => {
            setShowSuccess(false);
            form.reset();
        }, 300);
      }, 2000);
    } catch (error) {
      console.error("Error submitting claim:", error);
      form.setError("professional_email", {
        type: "manual",
        message: "Failed to submit claim. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md p-0 overflow-hidden border-0 ${showSuccess ? "bg-black" : "bg-background"}`}>
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center p-12 bg-black text-white min-h-[300px] animate-in fade-in zoom-in duration-300">
            <div className="rounded-full bg-[#eeff41ff]/20 p-4 mb-6">
              <Check className="h-10 w-10 text-[#eeff41ff]" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-[#eeff41ff]">Claim Request Sent</h3>
            <p className="text-gray-400 text-center text-sm max-w-[240px]">
              We'll review your request and get back to you shortly.
            </p>
          </div>
        ) : (
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl">Claim {architectName}</DialogTitle>
              <DialogDescription>
                Verify your professional identity to manage this profile.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="professional_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@studio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Claim"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
