import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
const formSchema = z.object({
    professional_email: z.string().email({
        message: "Please enter a valid professional email address.",
    }),
});
export function ClaimProfileDialog({ architectId, architectName, open, onOpenChange, onSuccess, }) {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            professional_email: "",
        },
    });
    async function onSubmit(values) {
        if (!user)
            return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from("architect_claims").insert({
                user_id: user.id,
                architect_id: architectId,
                proof_email: values.professional_email,
                status: "pending",
            });
            if (error)
                throw error;
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
        }
        catch (_error) {
            form.setError("professional_email", {
                type: "manual",
                message: "Failed to submit claim. Please try again.",
            });
        }
        finally {
            setIsSubmitting(false);
        }
    }
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsx(DialogContent, { className: `sm:max-w-md p-0 overflow-hidden border-0 ${showSuccess ? "bg-black" : "bg-surface-default"}`, children: showSuccess ? (_jsxs("div", { className: "flex flex-col items-center justify-center p-12 bg-black text-white min-h-[300px] animate-in fade-in zoom-in duration-300", children: [_jsx("div", { className: "rounded-full bg-[#eeff41ff]/20 p-4 mb-6", children: _jsx(Check, { className: "h-10 w-10 text-[#eeff41ff]" }) }), _jsx("h3", { className: "text-2xl font-bold mb-2 text-[#eeff41ff]", children: "Claim Request Sent" }), _jsx("p", { className: "text-gray-400 text-center text-sm max-w-[240px]", children: "We'll review your request and get back to you shortly." })] })) : (_jsxs("div", { className: "p-6", children: [_jsxs(DialogHeader, { className: "mb-6", children: [_jsxs(DialogTitle, { className: "text-xl", children: ["Claim ", architectName] }), _jsx(DialogDescription, { children: "Verify your professional identity to manage this profile." })] }), _jsx(Form, { ...form, children: _jsxs("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-6", children: [_jsx(FormField, { control: form.control, name: "professional_email", render: ({ field }) => (_jsxs(FormItem, { children: [_jsx(FormLabel, { children: "Professional Email" }), _jsx(FormControl, { children: _jsx(Input, { placeholder: "name@studio.com", ...field }) }), _jsx(FormMessage, {})] })) }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting ? "Submitting..." : "Submit Claim" })] })] }) })] })) }) }));
}
