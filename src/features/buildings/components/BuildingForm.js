import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildingSchema, editBuildingSchema } from "@/lib/validations/building";
import { Loader2, Plus, X, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { ArchitectSelect } from "@/components/ui/architect-select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/utils/url";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
const STATUS_OPTIONS = ['Built', 'Under Construction', 'Unbuilt', 'Lost', 'Temporary'];
const ACCESS_LEVEL_OPTIONS = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
    { label: 'Restricted', value: 'restricted' },
    { label: 'Commercial', value: 'commercial' }
];
const ACCESS_LOGISTICS_OPTIONS = [
    { label: 'Walk-in', value: 'walk-in' },
    { label: 'Booking Required', value: 'booking_required' },
    { label: 'Tour Only', value: 'tour_only' },
    { label: 'Exterior Only', value: 'exterior_only' }
];
const ACCESS_COST_OPTIONS = [
    { label: 'Free', value: 'free' },
    { label: 'Paid', value: 'paid' },
    { label: 'Customers Only', value: 'customers_only' }
];
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { ArchitectStatement } from "./ArchitectStatement";
export function BuildingForm({ initialValues, onSubmit, isSubmitting, submitLabel, mode = 'create', buildingId, shortId }) {
    const { profile } = useUserProfile();
    const [name, setName] = useState(initialValues.name);
    const [alt_name, setAltName] = useState(initialValues.alt_name || "");
    const [aliases, setAliases] = useState(initialValues.aliases || []);
    const [year_completed, setYear] = useState(initialValues.year_completed?.toString() || "");
    const [status, setStatus] = useState(initialValues.status || "");
    const [access_level, setAccessLevel] = useState(initialValues.access_level || "");
    const [access_logistics, setAccessLogistics] = useState(initialValues.access_logistics || "");
    const [access_cost, setAccessCost] = useState(initialValues.access_cost || "");
    const [access_notes, setAccessNotes] = useState(initialValues.access_notes || "");
    const [architect_statement, setArchitectStatement] = useState(initialValues.architect_statement || "");
    const [architects, setArchitects] = useState(initialValues.architects);
    const [functional_category_id, setCategoryId] = useState(initialValues.functional_category_id || "");
    const [functional_typology_ids, setTypologyIds] = useState(initialValues.functional_typology_ids);
    const [selected_attribute_ids, setAttributeIds] = useState(initialValues.selected_attribute_ids);
    const [isAddingTypology, setIsAddingTypology] = useState(false);
    const [newTypologyName, setNewTypologyName] = useState("");
    const [isAddingTypologyLoading, setIsAddingTypologyLoading] = useState(false);
    // Attribute creation state
    const [addingAttributeGroupId, setAddingAttributeGroupId] = useState(null);
    const [newAttributeName, setNewAttributeName] = useState("");
    const [isAddingAttributeLoading, setIsAddingAttributeLoading] = useState(false);
    const [debouncedName, setDebouncedName] = useState(name);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedName(name);
        }, 300);
        return () => clearTimeout(timer);
    }, [name]);
    const { data: isSlugAvailable, isLoading: isCheckingSlug } = useQuery({
        queryKey: ['slug_availability', debouncedName, buildingId],
        queryFn: async () => {
            const baseSlug = slugify(debouncedName);
            if (!baseSlug)
                return true;
            const { data, error } = await supabase.rpc('check_slug_availability', {
                target_slug: baseSlug,
                exclude_id: buildingId || null,
            });
            if (error) {
                return true; // Fallback to true on error to avoid blocking UX unnecessarily
            }
            return data;
        },
        enabled: !!debouncedName,
    });
    const baseSlug = slugify(debouncedName);
    const isSlugCollision = isSlugAvailable === false;
    const finalSlug = isSlugCollision ? `${baseSlug}-${shortId || '1'}` : baseSlug;
    const queryClient = useQueryClient();
    const [showYear, setShowYear] = useState(mode === 'create' ? true : !!initialValues.year_completed);
    const [showArchitects, setShowArchitects] = useState(mode === 'create' ? true : initialValues.architects.length > 0);
    const [showAliases, setShowAliases] = useState(mode === 'create' ? true : (!!initialValues.alt_name || (initialValues.aliases?.length ?? 0) > 0));
    const { data: categories, isLoading: isLoadingCategories } = useQuery({
        queryKey: ["functional_categories"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("functional_categories")
                .select("*")
                .order("name");
            if (error)
                throw error;
            return data;
        },
    });
    const { data: typologies, isLoading: isLoadingTypologies } = useQuery({
        queryKey: ["functional_typologies"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("functional_typologies")
                .select("*")
                .order("name");
            if (error)
                throw error;
            return data;
        },
    });
    const { data: attributeGroups, isLoading: isLoadingGroups } = useQuery({
        queryKey: ["attribute_groups"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("attribute_groups")
                .select("*")
                .order("name");
            if (error)
                throw error;
            return data;
        },
    });
    const isVerifiedArchitect = profile?.verified_architect_id && architects.some((a) => a.id === profile.verified_architect_id);
    const { data: attributes, isLoading: isLoadingAttributes } = useQuery({
        queryKey: ["attributes"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("attributes")
                .select("*")
                .order("name");
            if (error)
                throw error;
            return data;
        },
    });
    const handleCategoryChange = (value) => {
        setCategoryId(value);
        setTypologyIds([]); // Clear typologies when category changes
    };
    const handleAttributeGroupChange = (groupId, newGroupSelection) => {
        // Find all attributes belonging to this group
        const groupAttributeIds = attributes
            ?.filter((attr) => attr.group_id === groupId)
            .map((attr) => attr.id) || [];
        // Filter out any attributes from this group from the current selection
        const otherAttributes = selected_attribute_ids.filter((id) => !groupAttributeIds.includes(id));
        // Combine other attributes with the new selection for this group
        setAttributeIds([...otherAttributes, ...newGroupSelection]);
    };
    const handleAddTypology = async () => {
        if (!newTypologyName.trim())
            return;
        if (!functional_category_id) {
            toast.error("Please select a category first");
            return;
        }
        try {
            setIsAddingTypologyLoading(true);
            const slug = slugify(newTypologyName);
            const { data, error } = await supabase
                .from("functional_typologies")
                .insert({
                name: newTypologyName,
                parent_category_id: functional_category_id,
                slug: slug
            })
                .select()
                .single();
            if (error)
                throw error;
            await queryClient.invalidateQueries({ queryKey: ["functional_typologies"] });
            // Add to selection
            setTypologyIds(prev => [...prev, data.id]);
            setNewTypologyName("");
            setIsAddingTypology(false);
            toast.success("Typology added successfully");
        }
        catch (_error) {
            toast.error("Failed to add typology");
        }
        finally {
            setIsAddingTypologyLoading(false);
        }
    };
    const handleAddAttribute = async () => {
        if (!newAttributeName.trim() || !addingAttributeGroupId)
            return;
        try {
            setIsAddingAttributeLoading(true);
            const slug = slugify(newAttributeName);
            const { data, error } = await supabase
                .from("attributes")
                .insert({
                name: newAttributeName,
                group_id: addingAttributeGroupId,
                slug: slug
            })
                .select()
                .single();
            if (error)
                throw error;
            await queryClient.invalidateQueries({ queryKey: ["attributes"] });
            // Add to selection
            setAttributeIds(prev => [...prev, data.id]);
            setNewAttributeName("");
            setAddingAttributeGroupId(null);
            toast.success("Attribute added successfully");
        }
        catch (_error) {
            toast.error("Failed to add attribute");
        }
        finally {
            setIsAddingAttributeLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const rawData = {
                ...(mode === 'edit' && buildingId ? { id: buildingId } : {}),
                name,
                slug: finalSlug || undefined,
                alt_name: alt_name || null,
                aliases,
                // hero_image_url removed
                year_completed,
                status: status || null,
                access_level: access_level || null,
                access_logistics: access_logistics || null,
                access_cost: access_cost || null,
                access_notes: access_notes || null,
                architect_statement: architect_statement || null,
                architects,
                functional_category_id,
                functional_typology_ids,
                selected_attribute_ids,
            };
            const schema = mode === 'edit' ? editBuildingSchema : buildingSchema;
            const validationResult = await schema.safeParseAsync(rawData);
            if (!validationResult.success) {
                validationResult.error.errors.forEach((err) => {
                    toast.error(err.message);
                });
                return;
            }
            const formData = {
                ...validationResult.data,
                functional_category_id: validationResult.data.functional_category_id ?? null,
            };
            await onSubmit(formData);
        }
        catch (_error) {
        }
    };
    return (_jsx("div", { className: "max-w-2xl mx-auto w-full", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Name" }), _jsx(Input, { id: "name", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. Sydney Opera House", autoComplete: "off", className: "max-w-md" }), finalSlug && (_jsxs("div", { className: `flex items-center gap-1.5 mt-1 text-xs transition-colors duration-300 ${isSlugCollision ? 'text-amber-600 dark:text-amber-500' : 'text-text-secondary'}`, children: [isSlugCollision && _jsx(Info, { className: "h-3.5 w-3.5" }), _jsxs("span", { children: ["plano.com/b/", finalSlug, isCheckingSlug && _jsx("span", { className: "ml-2 animate-pulse opacity-50", children: "..." })] })] }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Status" }), _jsxs(Select, { value: status, onValueChange: setStatus, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select status" }) }), _jsx(SelectContent, { children: STATUS_OPTIONS.map((opt) => (_jsx(SelectItem, { value: opt, children: opt }, opt))) })] })] }), _jsxs("div", { className: "space-y-4 border border-border-default rounded-sm p-4 bg-surface-muted/30", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Access & Entry Logistics" }), _jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Level" }), _jsx(SegmentedControl, { options: ACCESS_LEVEL_OPTIONS, value: access_level || "", onValueChange: setAccessLevel, className: "w-full flex-wrap h-auto min-h-[36px]" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Logistics" }), _jsx(SegmentedControl, { options: ACCESS_LOGISTICS_OPTIONS, value: access_logistics || "", onValueChange: setAccessLogistics, className: "w-full flex-wrap h-auto min-h-[36px]" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Cost" }), _jsx(SegmentedControl, { options: ACCESS_COST_OPTIONS, value: access_cost || "", onValueChange: setAccessCost, className: "w-full flex-wrap h-auto min-h-[36px]" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Access Notes" }), _jsx(Textarea, { value: access_notes, onChange: (e) => setAccessNotes(e.target.value), placeholder: (access_cost === 'paid' || access_logistics === 'booking_required')
                                                ? "e.g., Add ticket link, entry prices, or booking instructions..."
                                                : "e.g., Closed on public holidays, enter through the east gate...", maxLength: 500, className: "resize-none max-w-xl", rows: 2 }), _jsxs("div", { className: "text-xs text-text-secondary text-right", children: [access_notes.length, "/500"] })] })] }), showAliases && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "alt_name", children: "Alternative Name (English)" }), _jsx(Input, { id: "alt_name", value: alt_name, onChange: (e) => setAltName(e.target.value), placeholder: "e.g. Eiffel Tower", autoComplete: "off" }), _jsx("p", { className: "text-xs text-text-secondary", children: "Display name for international users (e.g. 'Eiffel Tower' vs 'Tour Eiffel')." })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Search Aliases (Hidden)" }), _jsx(TagInput, { placeholder: "Add alias...", tags: aliases, setTags: setAliases }), _jsx("p", { className: "text-xs text-text-secondary", children: "Nicknames or alternate spellings for search only (e.g. 'Iron Lady'). Press Enter to add." })] })] })), showYear && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "year_completed", children: "Year Built" }), _jsx(Input, { id: "year_completed", type: "number", value: year_completed, onChange: (e) => setYear(e.target.value), placeholder: "e.g. 1973", autoComplete: "off", className: "max-w-[8rem]" })] })), (showArchitects || isVerifiedArchitect) && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Architects" }), _jsx(ArchitectSelect, { selectedArchitects: architects, setSelectedArchitects: setArchitects, placeholder: "Search architects or add new..." }), _jsx("p", { className: "text-xs text-text-secondary", children: "Add multiple architects if applicable. If not found, you can create a new one." })] }), isVerifiedArchitect && (_jsx("div", { className: "space-y-2 border border-border-default rounded-sm p-4 bg-surface-muted/30", children: _jsx(ArchitectStatement, { statement: architect_statement, isEditing: true, onChange: setArchitectStatement }) }))] })), mode !== 'create' && (!showYear || !showArchitects || !showAliases) && (_jsxs("div", { className: "flex gap-2 flex-wrap", children: [!showAliases && (_jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "rounded-sm h-8", onClick: () => setShowAliases(true), children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " Add Aliases"] })), !showYear && (_jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "rounded-sm h-8", onClick: () => setShowYear(true), children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " Add Year"] })), !showArchitects && (_jsxs(Button, { type: "button", variant: "outline", size: "sm", className: "rounded-sm h-8", onClick: () => setShowArchitects(true), children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " Add Architects"] }))] }))] }), _jsx(Separator, {}), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-base font-semibold", children: "Functional Classification" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Define the primary purpose of the building." })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "category-select", children: "Category" }), isLoadingCategories ? (_jsx(Skeleton, { className: "h-10 w-full" })) : (_jsxs(Select, { value: functional_category_id, onValueChange: handleCategoryChange, children: [_jsx(SelectTrigger, { id: "category-select", className: "w-full", children: _jsx(SelectValue, { placeholder: "Select a category" }) }), _jsx(SelectContent, { children: categories?.map((category) => (_jsx(SelectItem, { value: category.id, children: category.name }, category.id))) })] }))] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "Typology" }), isLoadingTypologies ? (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Skeleton, { className: "h-8 w-24" }), _jsx(Skeleton, { className: "h-8 w-32" }), _jsx(Skeleton, { className: "h-8 w-20" })] })) : !functional_category_id ? (_jsx("div", { className: "p-4 border-2 border-dashed border-border-default rounded-sm text-sm text-text-secondary text-center bg-surface-muted/20", children: "Please select a category first to see available typologies." })) : (_jsxs(ToggleGroup, { type: "multiple", variant: "outline", value: functional_typology_ids, onValueChange: setTypologyIds, className: "justify-start flex-wrap gap-2", children: [typologies
                                                    ?.filter((t) => t.parent_category_id === functional_category_id)
                                                    .map((typology) => (_jsx(ToggleGroupItem, { value: typology.id, className: "h-8 text-sm px-3 data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground", children: typology.name }, typology.id))), isAddingTypology ? (_jsxs("div", { className: "flex items-center gap-1 ml-2", children: [_jsx(Input, { value: newTypologyName, onChange: (e) => setNewTypologyName(e.target.value), className: "h-8 w-40 text-sm", placeholder: "New typology", autoFocus: true, onKeyDown: (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddTypology();
                                                                }
                                                            }, disabled: isAddingTypologyLoading }), _jsx(Button, { type: "button", size: "icon", variant: "ghost", className: "h-8 w-8 text-feedback-success hover:bg-feedback-success/10", onClick: handleAddTypology, disabled: isAddingTypologyLoading, children: isAddingTypologyLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Check, { className: "h-4 w-4" }) }), _jsx(Button, { type: "button", size: "icon", variant: "ghost", className: "h-8 w-8 text-feedback-destructive hover:bg-feedback-destructive/10", onClick: () => {
                                                                setIsAddingTypology(false);
                                                                setNewTypologyName("");
                                                            }, disabled: isAddingTypologyLoading, children: _jsx(X, { className: "h-4 w-4" }) })] })) : (_jsxs(Button, { type: "button", variant: "ghost", className: "h-8 text-sm px-2 text-text-secondary hover:text-text-primary ml-1", onClick: () => setIsAddingTypology(true), children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " Add another"] }))] })), functional_category_id && (typologies || []).filter(t => t.parent_category_id === functional_category_id).length === 0 && (_jsx("p", { className: "text-sm text-text-secondary", children: "No typologies found for this category." }))] })] })] }), _jsx(Separator, {}), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-base font-semibold", children: "Characteristics" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Add tags to describe the building's features." })] }), isLoadingGroups || isLoadingAttributes ? (_jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-4 w-32" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Skeleton, { className: "h-8 w-20" }), _jsx(Skeleton, { className: "h-8 w-24" })] }), _jsx(Skeleton, { className: "h-4 w-32" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Skeleton, { className: "h-8 w-24" }), _jsx(Skeleton, { className: "h-8 w-20" })] })] })) : (_jsx("div", { className: "space-y-6", children: attributeGroups?.map((group) => {
                                const groupAttributes = attributes?.filter((attr) => attr.group_id === group.id);
                                if (!groupAttributes || groupAttributes.length === 0)
                                    return null;
                                return (_jsxs("div", { className: "space-y-3", children: [_jsx(Label, { className: "text-xs uppercase text-text-secondary tracking-wider font-semibold", children: group.name }), _jsxs(ToggleGroup, { type: "multiple", variant: "outline", value: selected_attribute_ids.filter((id) => groupAttributes.some((attr) => attr.id === id)), onValueChange: (newSelection) => handleAttributeGroupChange(group.id, newSelection), className: "justify-start flex-wrap gap-2", children: [groupAttributes.map((attr) => (_jsx(ToggleGroupItem, { value: attr.id, className: "h-8 text-sm px-3 data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground", children: attr.name }, attr.id))), addingAttributeGroupId === group.id ? (_jsxs("div", { className: "flex items-center gap-1 ml-2", children: [_jsx(Input, { value: newAttributeName, onChange: (e) => setNewAttributeName(e.target.value), className: "h-8 w-40 text-sm", placeholder: "New attribute", autoFocus: true, onKeyDown: (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddAttribute();
                                                                }
                                                            }, disabled: isAddingAttributeLoading }), _jsx(Button, { type: "button", size: "icon", variant: "ghost", className: "h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50", onClick: handleAddAttribute, disabled: isAddingAttributeLoading, children: isAddingAttributeLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Check, { className: "h-4 w-4" }) }), _jsx(Button, { type: "button", size: "icon", variant: "ghost", className: "h-8 w-8 text-feedback-destructive hover:bg-feedback-destructive/10", onClick: () => {
                                                                setAddingAttributeGroupId(null);
                                                                setNewAttributeName("");
                                                            }, disabled: isAddingAttributeLoading, children: _jsx(X, { className: "h-4 w-4" }) })] })) : (_jsxs(Button, { type: "button", variant: "ghost", className: "h-8 text-sm px-2 text-text-secondary hover:text-text-primary ml-1", onClick: () => setAddingAttributeGroupId(group.id), children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " Add another"] }))] })] }, group.id));
                            }) }))] }), _jsx("div", { className: "flex items-center justify-end gap-3 pt-6 border-t border-border-default mt-6", children: _jsx(Button, { type: "submit", variant: "default", disabled: isSubmitting, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin text-text-secondary" }), "Saving..."] })) : (submitLabel) }) })] }) }));
}
