import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Loader2 } from "lucide-react";
import { ItineraryGenerationOverlay } from "./ItineraryGenerationOverlay";
export function PlanRouteDialog({ open, onOpenChange, collectionId, onPlanGenerated, hasItinerary, }) {
    const { toast } = useToast();
    const [days, setDays] = useState(3);
    const [transportMode, setTransportMode] = useState("walking");
    const [isLoading, setIsLoading] = useState(false);
    const handleDelete = async () => {
        if (!collectionId)
            return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("collections")
                .update({ itinerary: null })
                .eq("id", collectionId);
            if (error)
                throw error;
            toast({
                title: "Itinerary Removed",
                description: "The itinerary has been successfully removed.",
            });
            onOpenChange(false);
            if (onPlanGenerated) {
                onPlanGenerated('removed');
            }
        }
        catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to remove itinerary.",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!collectionId)
            return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("generate-itinerary", {
                body: {
                    collection_id: collectionId,
                    days: Number(days),
                    transportMode: transportMode,
                },
            });
            if (error)
                throw error;
            // Check if the function returned an error in the body
            if (data && data.error) {
                throw new Error(data.error);
            }
            toast({
                title: "Itinerary Generated",
                description: "Your route has been successfully planned.",
            });
            onOpenChange(false);
            if (onPlanGenerated) {
                onPlanGenerated('created');
            }
        }
        catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to generate itinerary. Please try again.",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs(Dialog, { open: open, onOpenChange: onOpenChange, children: [_jsx(ItineraryGenerationOverlay, { open: isLoading }), _jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u2728 Plan Route" }), _jsx(DialogDescription, { children: "Optimize your trip by selecting the number of days and your preferred mode of transport." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "days", children: "Number of Days" }), _jsx(Input, { id: "days", type: "number", min: 1, max: 14, value: days, onChange: (e) => setDays(parseInt(e.target.value) || 1), required: true }), _jsx("p", { className: "text-xs text-text-secondary", children: "Select between 1 and 14 days for your itinerary." })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Transport Mode" }), _jsx(SegmentedControl, { value: transportMode, onValueChange: setTransportMode, options: [
                                            { label: "Walking", value: "walking" },
                                            { label: "Cycling", value: "cycling" },
                                            { label: "Driving", value: "driving" },
                                        ] })] }), _jsxs(DialogFooter, { className: "flex-col sm:justify-between sm:space-x-0", children: [hasItinerary && (_jsx(Button, { type: "button", variant: "link", onClick: handleDelete, disabled: isLoading, className: "mb-2 sm:mb-0 text-feedback-destructive hover:text-feedback-destructive/90", children: "Remove Itinerary" })), _jsxs("div", { className: "flex gap-2 justify-end w-full sm:w-auto", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), disabled: isLoading, children: "Cancel" }), _jsx(Button, { type: "submit", disabled: isLoading, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Generating..."] })) : ("Generate Itinerary") })] })] })] })] })] }));
}
