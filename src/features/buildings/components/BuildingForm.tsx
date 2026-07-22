import { useState, useEffect } from "react";
import { useHoneypot } from "@/hooks/useHoneypot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BuildingFormLabel, BuildingFormSection } from "@/features/buildings/components/building-form-ui";
import { buildingSchema, editBuildingSchema } from "@/lib/validations/building";
import { Loader2, Plus, X, Check, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  CreditedEntitiesSelect,
  type CreditedEntityTag,
} from "@/features/credits/components/CreditedEntitiesSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/utils/url";
import { FunctionalCategory, FunctionalTypology, AttributeGroup, Attribute } from "@/types/classification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";

import {
  SIZE_CATEGORY_OPTIONS,
  SIZE_REFERENCE_ROWS,
  STATUS_OPTIONS,
  ACCESS_LEVEL_OPTIONS,
  ACCESS_LOGISTICS_OPTIONS,
  ACCESS_COST_OPTIONS,
} from "./buildingFormOptions";

export interface BuildingFormData {
  name: string;
  /** URL slug from `check_slug_availability` / collision suffix (create + edit flows). */
  slug?: string;
  alt_name?: string | null;
  aliases?: string[];
  hero_image_url?: string | null;
  century?: number | null;
  year_completed: number | null;
  status?: string | null;
  access_level?: string | null;
  access_logistics?: string | null;
  access_cost?: string | null;
  access_notes?: string | null;
  architect_statement?: string | null;
  size_category?: string | null;
  size_sqm?: number | null;
  height_m?: number | null;
  storeys?: number | null;
  designCreditEntities: CreditedEntityTag[];
  functional_category_id: string | null;
  functional_typology_ids: string[];
  selected_attribute_ids: string[];
}

interface BuildingFormProps {
  initialValues: BuildingFormData;
  onSubmit: (data: BuildingFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  mode?: 'create' | 'edit';
  buildingId?: string;
  shortId?: number | null;
  /** When provided, renders a Cancel button in the action bar. */
  onCancel?: () => void;
  /** Emits whether the form fields differ from their initial values. */
  onDirtyChange?: (dirty: boolean) => void;
}

import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { ArchitectStatement } from "./ArchitectStatement";
import { useBuildingFormDirty } from "./useBuildingFormDirty";

export function BuildingForm({ initialValues, onSubmit, isSubmitting, submitLabel, mode = 'create', buildingId, shortId, onCancel, onDirtyChange }: BuildingFormProps) {
  const { honeypotProps, isBot } = useHoneypot();
  const { profile } = useUserProfile();

  const [name, setName] = useState(initialValues.name);
  const [alt_name, setAltName] = useState(initialValues.alt_name || "");
  const [aliases, setAliases] = useState<string[]>(initialValues.aliases || []);
  const [year_completed, setYear] = useState<string>(initialValues.year_completed?.toString() || "");
  const [century_manual, setCenturyManual] = useState<string>(initialValues.century?.toString() || "");
  const [status, setStatus] = useState<string>(initialValues.status || "");
  const [access_level, setAccessLevel] = useState<string>(initialValues.access_level || "");
  const [access_logistics, setAccessLogistics] = useState<string>(initialValues.access_logistics || "");
  const [access_cost, setAccessCost] = useState<string>(initialValues.access_cost || "");
  const [access_notes, setAccessNotes] = useState<string>(initialValues.access_notes || "");
  const [architect_statement, setArchitectStatement] = useState<string>(initialValues.architect_statement || "");
  const [size_category, setSizeCategory] = useState<string>(initialValues.size_category || "");
  const [size_sqm, setSizeSqm] = useState<string>(initialValues.size_sqm?.toString() || "");
  const [height_m, setHeightM] = useState<string>(initialValues.height_m?.toString() || "");
  const [storeys, setStoreys] = useState<string>(initialValues.storeys?.toString() || "");
  const [designCreditEntities, setDesignCreditEntities] = useState<CreditedEntityTag[]>(
    initialValues.designCreditEntities,
  );
  const [functional_category_id, setCategoryId] = useState<string>(initialValues.functional_category_id || "");
  const [functional_typology_ids, setTypologyIds] = useState<string[]>(initialValues.functional_typology_ids);
  const [selected_attribute_ids, setAttributeIds] = useState<string[]>(initialValues.selected_attribute_ids);
  const [isAddingTypology, setIsAddingTypology] = useState(false);
  const [newTypologyName, setNewTypologyName] = useState("");
  const [isAddingTypologyLoading, setIsAddingTypologyLoading] = useState(false);

  // Attribute creation state
  const [addingAttributeGroupId, setAddingAttributeGroupId] = useState<string | null>(null);
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
      if (!baseSlug) return true;

      const { data, error } = await supabase.rpc('check_slug_availability', {
        target_slug: baseSlug,
        ...(buildingId ? { exclude_id: buildingId } : {}),
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
  const [showDesignCredits, setShowDesignCredits] = useState(
    mode === "create" ? true : initialValues.designCreditEntities.length > 0,
  );
  const [showAliases, setShowAliases] = useState(
    mode === 'create' ? true : (!!initialValues.alt_name || (initialValues.aliases?.length ?? 0) > 0)
  );

  const isDirty = useBuildingFormDirty(
    initialValues,
    {
      name, alt_name, aliases, year_completed, century_manual, status,
      access_level, access_logistics, access_cost, access_notes, architect_statement,
      size_category, size_sqm, height_m, storeys, designCreditEntities,
      functional_category_id, functional_typology_ids, selected_attribute_ids,
    },
    onDirtyChange,
  );

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["functional_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("functional_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as FunctionalCategory[];
    },
  });

  const { data: typologies, isLoading: isLoadingTypologies } = useQuery({
    queryKey: ["functional_typologies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("functional_typologies")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as FunctionalTypology[];
    },
  });

  const { data: attributeGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["attribute_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attribute_groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as AttributeGroup[];
    },
  });

  const isVerifiedCreditClaim =
    !!profile?.verified_architect_id &&
    designCreditEntities.some((e) => e.id === profile.verified_architect_id);

  const { data: attributes, isLoading: isLoadingAttributes } = useQuery({
    queryKey: ["attributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attributes")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Attribute[];
    },
  });

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    setTypologyIds([]); // Clear typologies when category changes
  };

  const handleAttributeGroupChange = (groupId: string, newGroupSelection: string[]) => {
    // Find all attributes belonging to this group
    const groupAttributeIds = attributes
      ?.filter((attr) => attr.group_id === groupId)
      .map((attr) => attr.id) || [];

    // Filter out any attributes from this group from the current selection
    const otherAttributes = selected_attribute_ids.filter(
      (id) => !groupAttributeIds.includes(id)
    );

    // Combine other attributes with the new selection for this group
    setAttributeIds([...otherAttributes, ...newGroupSelection]);
  };

  const handleAddTypology = async () => {
    if (!newTypologyName.trim()) return;

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

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["functional_typologies"] });

      // Add to selection
      setTypologyIds(prev => [...prev, data.id]);

      setNewTypologyName("");
      setIsAddingTypology(false);
      toast.success("Typology added successfully");

    } catch (_error) {
toast.error("Failed to add typology");
    } finally {
      setIsAddingTypologyLoading(false);
    }
  };

  const handleAddAttribute = async () => {
    if (!newAttributeName.trim() || !addingAttributeGroupId) return;

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

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["attributes"] });

      // Add to selection
      setAttributeIds(prev => [...prev, data.id]);

      setNewAttributeName("");
      setAddingAttributeGroupId(null);
      toast.success("Attribute added successfully");

    } catch (_error) {
toast.error("Failed to add attribute");
    } finally {
      setIsAddingAttributeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBot()) return;

    try {
      const yearNum = year_completed ? parseInt(year_completed, 10) : null;
      const derivedCentury = yearNum && !isNaN(yearNum) ? Math.ceil(yearNum / 100) : null;
      const rawData = {
        ...(mode === 'edit' && buildingId ? { id: buildingId } : {}),
        name,
        slug: finalSlug || undefined,
        alt_name: alt_name || null,
        aliases,
        // hero_image_url removed
        century: derivedCentury ?? (century_manual || null),
        year_completed,
        status: status || null,
        access_level: access_level || null,
        access_logistics: access_logistics || null,
        access_cost: access_cost || null,
        access_notes: access_notes || null,
        architect_statement: architect_statement || null,
        size_category: size_category || null,
        size_sqm: size_sqm ? parseFloat(size_sqm) : null,
        height_m: height_m ? parseFloat(height_m) : null,
        storeys: storeys ? parseInt(storeys, 10) : null,
        designCreditEntities,
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
      } as BuildingFormData;

      await onSubmit(formData);

    } catch (_error) {
}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <BuildingFormSection title="Basics">
        <div className="space-y-2">
          <BuildingFormLabel htmlFor="name">Name</BuildingFormLabel>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sydney Opera House"
            autoComplete="off"
            className="max-w-md"
          />
          {isSlugCollision && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-feedback-warning">
              <Info className="h-3.5 w-3.5" />
              <span>
                A building with this name already exists — a unique suffix will be appended to its URL.
                {isCheckingSlug && <span className="ml-2 animate-pulse opacity-50">...</span>}
              </span>
            </div>
          )}
        </div>


        <div className="space-y-2">
          <BuildingFormLabel>Status</BuildingFormLabel>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </BuildingFormSection>

      <BuildingFormSection title="Access & entry">
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <BuildingFormLabel>Level</BuildingFormLabel>
              <SegmentedControl
                options={ACCESS_LEVEL_OPTIONS}
                value={access_level || ""}
                onValueChange={setAccessLevel}
                className="w-full flex-wrap h-auto min-h-[36px]"
              />
            </div>

            <div className="space-y-2">
              <BuildingFormLabel>Logistics</BuildingFormLabel>
              <SegmentedControl
                options={ACCESS_LOGISTICS_OPTIONS}
                value={access_logistics || ""}
                onValueChange={setAccessLogistics}
                className="w-full flex-wrap h-auto min-h-[36px]"
              />
            </div>

            <div className="space-y-2">
              <BuildingFormLabel>Cost</BuildingFormLabel>
              <SegmentedControl
                options={ACCESS_COST_OPTIONS}
                value={access_cost || ""}
                onValueChange={setAccessCost}
                className="w-full flex-wrap h-auto min-h-[36px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <BuildingFormLabel>Access notes</BuildingFormLabel>
            <Textarea
              value={access_notes}
              onChange={(e) => setAccessNotes(e.target.value)}
              placeholder={(access_cost === 'paid' || access_logistics === 'booking_required')
                ? "e.g., Add ticket link, entry prices, or booking instructions..."
                : "e.g., Closed on public holidays, enter through the east gate..."}
              maxLength={500}
              className="resize-none max-w-xl"
              rows={2}
            />
            <div className="text-xs text-text-secondary text-right">
              {access_notes.length}/500
            </div>
          </div>
      </BuildingFormSection>

      <BuildingFormSection title="Size">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-4 w-4 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Size reference guide"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-[420px] max-w-[90vw] p-0 overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-1">Size Reference</p>
                  <p className="text-xs text-text-secondary">Categorization based on Gross Floor Area (GFA).</p>
                </div>
                <table className="w-full text-xs border-t border-border-default">
                  <thead>
                    <tr className="border-b border-border-default bg-surface-muted/40">
                      <th className="text-left px-4 py-2 font-semibold text-text-secondary">Category</th>
                      <th className="text-left px-4 py-2 font-semibold text-text-secondary">GFA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {SIZE_REFERENCE_ROWS.map((row) => (
                      <tr key={row.label}>
                        <td className="px-4 py-2 font-medium text-text-primary">{row.label}</td>
                        <td className="px-4 py-2 text-text-secondary">{row.gfa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <BuildingFormLabel>Category</BuildingFormLabel>
            <Select value={size_category} onValueChange={setSizeCategory}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select size category" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <BuildingFormLabel htmlFor="size_sqm">Floor area (m²)</BuildingFormLabel>
              <Input
                id="size_sqm"
                type="number"
                min={0}
                value={size_sqm}
                onChange={(e) => setSizeSqm(e.target.value)}
                placeholder="e.g. 4200"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <BuildingFormLabel htmlFor="storeys">Storeys</BuildingFormLabel>
              <Input
                id="storeys"
                type="number"
                min={1}
                step={1}
                value={storeys}
                onChange={(e) => setStoreys(e.target.value)}
                placeholder="e.g. 8"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <BuildingFormLabel htmlFor="height_m">Height (m)</BuildingFormLabel>
              <Input
                id="height_m"
                type="number"
                min={0}
                value={height_m}
                onChange={(e) => setHeightM(e.target.value)}
                placeholder="e.g. 32"
                autoComplete="off"
              />
            </div>
          </div>
      </BuildingFormSection>

      {showAliases && (
        <BuildingFormSection title="Names & search">
            <div className="space-y-2">
              <BuildingFormLabel htmlFor="alt_name">Alternative name (English)</BuildingFormLabel>
              <Input
                id="alt_name"
                value={alt_name}
                onChange={(e) => setAltName(e.target.value)}
                placeholder="e.g. Eiffel Tower"
                autoComplete="off"
              />
              <p className="text-xs text-text-secondary">
                Display name for international users (e.g. 'Eiffel Tower' vs 'Tour Eiffel').
              </p>
            </div>

            <div className="space-y-2">
              <BuildingFormLabel>Search aliases (hidden)</BuildingFormLabel>
              <TagInput
                placeholder="Add alias..."
                tags={aliases}
                setTags={setAliases}
              />
              <p className="text-xs text-text-secondary">
                Nicknames or alternate spellings for search only (e.g. 'Iron Lady'). Press Enter to add.
              </p>
            </div>
        </BuildingFormSection>
      )}

      {showYear && (
        <BuildingFormSection title="Year built">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <BuildingFormLabel htmlFor="year_completed">Year built</BuildingFormLabel>
              <Input
                id="year_completed"
                type="number"
                value={year_completed}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1973"
                autoComplete="off"
                className="max-w-32"
              />
            </div>
            <div className="space-y-2">
              <BuildingFormLabel htmlFor="century">
                Century
                {year_completed && !isNaN(parseInt(year_completed, 10)) && (
                  <span className="ml-1.5 text-xs font-normal text-text-secondary">(auto)</span>
                )}
              </BuildingFormLabel>
              <Input
                id="century"
                type="number"
                min={1}
                step={1}
                value={
                  year_completed && !isNaN(parseInt(year_completed, 10))
                    ? Math.ceil(parseInt(year_completed, 10) / 100)
                    : century_manual
                }
                onChange={(e) => {
                  if (!year_completed || isNaN(parseInt(year_completed, 10))) {
                    setCenturyManual(e.target.value);
                  }
                }}
                readOnly={!!(year_completed && !isNaN(parseInt(year_completed, 10)))}
                placeholder="e.g. 20"
                autoComplete="off"
                className="max-w-24"
              />
            </div>
          </div>
        </BuildingFormSection>
      )}

        {(showDesignCredits || isVerifiedCreditClaim) && (
          <BuildingFormSection title="Design credits">
            <div className="space-y-2">
              <BuildingFormLabel>Primary credits</BuildingFormLabel>
              <CreditedEntitiesSelect
                selected={designCreditEntities}
                onChange={setDesignCreditEntities}
                placeholder="Search people or companies…"
              />
              <p className="text-xs text-text-secondary">
                Add everyone who should appear as a primary design credit. Create a new person or company if needed.
              </p>
            </div>

            {isVerifiedCreditClaim && (
              <div className="space-y-2 border border-border-default rounded-sm p-4 bg-surface-muted/30">
                <ArchitectStatement
                  statement={architect_statement}
                  isEditing={true}
                  onChange={setArchitectStatement}
                />
              </div>
            )}
          </BuildingFormSection>
        )}

        {mode !== "create" && (!showYear || !showDesignCredits || !showAliases) && (
            <div className="flex gap-2 flex-wrap">
                {!showAliases && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-sm h-8"
                        onClick={() => setShowAliases(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add Aliases
                    </Button>
                )}
                {!showYear && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-sm h-8"
                        onClick={() => setShowYear(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add Year
                    </Button>
                )}
                {!showDesignCredits && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-sm h-8"
                        onClick={() => setShowDesignCredits(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add design credits
                    </Button>
                )}
            </div>
        )}

      <BuildingFormSection
        title="Functional classification"
        description="Define the primary purpose of the building."
      >
          <div className="space-y-1.5">
            <BuildingFormLabel htmlFor="category-select">Category</BuildingFormLabel>
            {isLoadingCategories ? (
               <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={functional_category_id} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category-select" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <BuildingFormLabel>Typology</BuildingFormLabel>
            {isLoadingTypologies ? (
               <div className="flex flex-wrap gap-2">
                 <Skeleton className="h-8 w-24" />
                 <Skeleton className="h-8 w-32" />
                 <Skeleton className="h-8 w-20" />
               </div>
            ) : !functional_category_id ? (
              <div className="p-4 border-2 border-dashed border-border-default rounded-sm text-sm text-text-secondary text-center bg-surface-muted/20">
                Please select a category first to see available typologies.
              </div>
            ) : (
              <ToggleGroup
                type="multiple"
                variant="outline"
                value={functional_typology_ids}
                onValueChange={setTypologyIds}
                className="justify-start flex-wrap gap-2"
              >
                {typologies
                  ?.filter((t) => t.parent_category_id === functional_category_id)
                  .map((typology) => (
                    <ToggleGroupItem
                      key={typology.id}
                      value={typology.id}
                      className="h-8 text-sm px-3 data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground"
                    >
                      {typology.name}
                    </ToggleGroupItem>
                  ))}

                  {isAddingTypology ? (
                    <div className="flex items-center gap-1 ml-2">
                        <Input
                            value={newTypologyName}
                            onChange={(e) => setNewTypologyName(e.target.value)}
                            className="h-8 w-40 text-sm"
                            placeholder="New typology"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTypology();
                                }
                            }}
                            disabled={isAddingTypologyLoading}
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-feedback-success hover:bg-feedback-success/10"
                            onClick={handleAddTypology}
                            disabled={isAddingTypologyLoading}
                        >
                            {isAddingTypologyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-feedback-destructive hover:bg-feedback-destructive/10"
                            onClick={() => {
                                setIsAddingTypology(false);
                                setNewTypologyName("");
                            }}
                            disabled={isAddingTypologyLoading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-8 text-sm px-2 text-text-secondary hover:text-text-primary ml-1"
                        onClick={() => setIsAddingTypology(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add another
                    </Button>
                )}
              </ToggleGroup>
            )}
            {functional_category_id && (typologies || []).filter(t => t.parent_category_id === functional_category_id).length === 0 && (
                 <p className="text-sm text-text-secondary">No typologies found for this category.</p>
            )}
          </div>
      </BuildingFormSection>

      <BuildingFormSection
        title="Characteristics"
        description="Add tags to describe the building's features."
      >
        {isLoadingGroups || isLoadingAttributes ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-24" /></div>
            <Skeleton className="h-4 w-32" />
             <div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-20" /></div>
          </div>
        ) : (
          <div className="space-y-6">
            {attributeGroups?.map((group) => {
              const groupAttributes = attributes?.filter(
                (attr) => attr.group_id === group.id
              );

              if (!groupAttributes || groupAttributes.length === 0) return null;

              return (
                <div key={group.id} className="space-y-3">
                  <BuildingFormLabel className="block">
                    {group.name}
                  </BuildingFormLabel>
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={selected_attribute_ids.filter((id) =>
                      groupAttributes.some((attr) => attr.id === id)
                    )}
                    onValueChange={(newSelection) => handleAttributeGroupChange(group.id, newSelection)}
                    className="justify-start flex-wrap gap-2"
                  >
                    {groupAttributes.map((attr) => (
                      <ToggleGroupItem
                        key={attr.id}
                        value={attr.id}
                        className="h-8 text-sm px-3 data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground"
                      >
                        {attr.name}
                      </ToggleGroupItem>
                    ))}

                    {addingAttributeGroupId === group.id ? (
                      <div className="flex items-center gap-1 ml-2">
                        <Input
                          value={newAttributeName}
                          onChange={(e) => setNewAttributeName(e.target.value)}
                          className="h-8 w-40 text-sm"
                          placeholder="New attribute"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAttribute();
                            }
                          }}
                          disabled={isAddingAttributeLoading}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-feedback-success hover:text-feedback-success hover:bg-feedback-success/10"
                          onClick={handleAddAttribute}
                          disabled={isAddingAttributeLoading}
                        >
                          {isAddingAttributeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-feedback-destructive hover:bg-feedback-destructive/10"
                          onClick={() => {
                            setAddingAttributeGroupId(null);
                            setNewAttributeName("");
                          }}
                          disabled={isAddingAttributeLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 text-sm px-2 text-text-secondary hover:text-text-primary ml-1"
                        onClick={() => setAddingAttributeGroupId(group.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add another
                      </Button>
                    )}
                  </ToggleGroup>
                </div>
              );
            })}
          </div>
        )}
      </BuildingFormSection>

      <input {...honeypotProps} />

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-border-default bg-surface-default/95 px-4 py-3 backdrop-blur-xs">
        {mode === 'edit' && !isDirty && (
          <span className="mr-auto text-xs text-text-secondary">No changes to save</span>
        )}
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="default"
          disabled={isSubmitting || (mode === 'edit' && !isDirty)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-text-secondary" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
