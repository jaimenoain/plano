import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { BuildingForm } from "./BuildingForm";
import { useAuth } from "@/features/auth/hooks/useAuth";
export function AddBuildingDetails({ locationData, onBack }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const handleFormSubmit = async (data) => {
        if (!user) {
            toast.error("You must be logged in to add a building");
            return;
        }
        setIsSubmitting(true);
        try {
            // 2. Insert Building
            const { data: insertedData, error } = await supabase
                .from('buildings')
                .insert({
                name: data.name,
                // @ts-expect-error -- legacy Supabase row typing
                slug: data.slug || undefined,
                alt_name: data.alt_name || null,
                aliases: data.aliases || [],
                year_completed: data.year_completed,
                status: data.status,
                access_level: data.access_level,
                access_logistics: data.access_logistics,
                access_cost: data.access_cost,
                access_notes: data.access_notes,
                // Location Data (Merged from Main & Feature branches)
                address: locationData.address,
                city: locationData.city,
                country: locationData.country,
                // PostGIS point format "POINT(lng lat)"
                location: `POINT(${locationData.lng} ${locationData.lat})`,
                location_precision: locationData.precision || 'exact',
                created_by: user.id,
                functional_category_id: data.functional_category_id,
            })
                .select()
                .single();
            if (error)
                throw error;
            const buildingId = insertedData.id;
            // 3. Insert User Building (Auto-add to creator's list)
            try {
                const { error: userBuildingError } = await supabase
                    .from('user_buildings')
                    .insert({
                    user_id: user.id,
                    building_id: buildingId,
                    status: 'visited',
                    created_at: new Date().toISOString()
                });
                if (userBuildingError)
                    throw userBuildingError;
            }
            catch (_err) {
                void _err;
            }
            // 4. Insert Architect Links (Junction Table Logic)
            if (data.architects.length > 0) {
                try {
                    const links = data.architects.map(a => ({
                        building_id: buildingId,
                        architect_id: a.id
                    }));
                    const { error: linkError } = await supabase
                        .from('building_architects')
                        .insert(links);
                    if (linkError)
                        throw linkError;
                }
                catch (_err) {
                    void _err;
                }
            }
            // 5. Insert Typologies (Junction Table)
            if (data.functional_typology_ids.length > 0) {
                try {
                    const typologyLinks = data.functional_typology_ids.map(tId => ({
                        building_id: buildingId,
                        typology_id: tId
                    }));
                    const { error: _typoError } = await supabase
                        .from('building_functional_typologies')
                        .insert(typologyLinks);
                }
                catch (_err) {
                }
            }
            // 6. Insert Attributes (Junction Table)
            if (data.selected_attribute_ids.length > 0) {
                try {
                    const attributeLinks = data.selected_attribute_ids.map(aId => ({
                        building_id: buildingId,
                        attribute_id: aId
                    }));
                    const { error: _attrError } = await supabase
                        .from('building_attributes')
                        .insert(attributeLinks);
                }
                catch (_err) {
                }
            }
            // 7. Success State
            toast.success("Building added successfully!");
            navigate(`/building/${insertedData.id}`);
        }
        catch (error) {
            toast.error(`Failed to save building: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const initialValues = {
        name: locationData.name || "",
        alt_name: "",
        aliases: [],
        year_completed: null,
        status: null,
        access_level: null,
        access_logistics: null,
        access_cost: null,
        access_notes: null,
        architects: [],
        functional_category_id: "",
        functional_typology_ids: [],
        selected_attribute_ids: [],
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-2 mb-8", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: onBack, children: _jsx(ArrowLeft, { className: "h-4 w-4" }) }), _jsx("h1", { className: "text-4xl font-bold tracking-tight text-text-primary", children: "Add Details" })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Building Information" }), _jsxs(CardDescription, { children: ["Tell us more about ", locationData.name || locationData.address] })] }), _jsx(CardContent, { children: _jsx(BuildingForm, { initialValues: initialValues, onSubmit: handleFormSubmit, isSubmitting: isSubmitting, submitLabel: "Save Building", mode: "create" }) })] })] }));
}
