import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildingSchema, editBuildingSchema } from "@/lib/validations/building";
import { Loader2, Plus, X, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { ArchitectSelect, Architect } from "@/components/ui/architect-select";
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
import { Separator } from "@/components/ui/separator";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";

const STATUS_OPTIONS = ['Built', 'Under Construction', 'Unbuilt', 'Demolished', 'Temporary'];
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

export interface BuildingFormData {
  name: string;
  alt_name?: string | null;
  aliases?: string[];
  hero_image_url?: string | null;
  year_completed: number | null;
  status?: string | null;
  access_level?: string | null;
  access_logistics?: string | null;
  access_cost?: string | null;
  access_notes?: string | null;
  architects: Architect[];
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
}

export function BuildingForm({ initialValues, onSubmit, isSubmitting, submitLabel, mode = 'create', buildingId, shortId }: BuildingFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [alt_name, setAltName] = useState(initialValues.alt_name || "");
  const [aliases, setAliases] = useState<string[]>(initialValues.aliases || []);
  const [year_completed, setYear] = useState<string>(initialValues.year_completed?.toString() || "");
  const [status, setStatus] = useState<string>(initialValues.status || "");
  const [access_level, setAccessLevel] = useState<string>(initialValues.access_level || "");
  const [access_logistics, setAccessLogistics] = useState<string>(initialValues.access_logistics || "");
  const [access_cost, setAccessCost] = useState<string>(initialValues.access_cost || "");
  const [access_notes, setAccessNotes] = useState<string>(initialValues.access_notes || "");
  const [architects, setArchitects] = useState<Architect[]>(initialValues.architects);
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
        exclude_id: buildingId || null,
      });

      if (error) {
        console.error("Error checking slug availability:", error);
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

  const [showYear, setShowYear] = useState(!!initialValues.year_completed);
  const [showArchitects, setShowArchitects] = useState(initialValues.architects.length > 0);
  const [showAliases, setShowAliases] = useState(!!initialValues.alt_name || (initialValues.aliases?.length ?? 0) > 0);

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

    } catch (error) {
      console.error("Error adding typology:", error);
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

    } catch (error) {
      console.error("Error adding attribute:", error);
      toast.error("Failed to add attribute");
    } finally {
      setIsAddingAttributeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      const formData: BuildingFormData = {
        ...validationResult.data,
        functional_category_id: validationResult.data.functional_category_id ?? null,
      };

      await onSubmit(formData);

    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sydney Opera House"
            autoComplete="off"
          />
          {finalSlug && (
            <div className={`flex items-center gap-1.5 mt-1 text-xs transition-colors duration-300 ${isSlugCollision ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}>
              {isSlugCollision && <Info className="h-3.5 w-3.5" />}
              <span>
                plano.com/b/{finalSlug}
                {isCheckingSlug && <span className="ml-2 animate-pulse opacity-50">...</span>}
              </span>
            </div>
          )}
        </div>


        <div className="space-y-2">
          <Label>Status</Label>
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

        <div className="space-y-4 border rounded-md p-4 bg-muted/5">
          <h3 className="text-sm font-semibold">Access & Entry Logistics</h3>

          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label>Level</Label>
              <SegmentedControl
                options={ACCESS_LEVEL_OPTIONS}
                value={access_level || ""}
                onValueChange={setAccessLevel}
                className="w-full flex-wrap h-auto min-h-[36px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Logistics</Label>
              <SegmentedControl
                options={ACCESS_LOGISTICS_OPTIONS}
                value={access_logistics || ""}
                onValueChange={setAccessLogistics}
                className="w-full flex-wrap h-auto min-h-[36px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Cost</Label>
              <SegmentedControl
                options={ACCESS_COST_OPTIONS}
                value={access_cost || ""}
                onValueChange={setAccessCost}
                className="w-full flex-wrap h-auto min-h-[36px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Access Notes</Label>
            <Textarea
              value={access_notes}
              onChange={(e) => setAccessNotes(e.target.value)}
              placeholder={(access_cost === 'paid' || access_logistics === 'booking_required')
                ? "e.g., Add ticket link, entry prices, or booking instructions..."
                : "e.g., Closed on public holidays, enter through the east gate..."}
              maxLength={500}
              className="resize-none"
              rows={2}
            />
            <div className="text-xs text-muted-foreground text-right">
              {access_notes.length}/500
            </div>
          </div>
        </div>

        {/* Alt Name & Aliases */}
        {showAliases && (
          <>
            <div className="space-y-2">
              <Label htmlFor="alt_name">Alternative Name (English)</Label>
              <Input
                id="alt_name"
                value={alt_name}
                onChange={(e) => setAltName(e.target.value)}
                placeholder="e.g. Eiffel Tower"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Display name for international users (e.g. 'Eiffel Tower' vs 'Tour Eiffel').
              </p>
            </div>

            <div className="space-y-2">
              <Label>Search Aliases (Hidden)</Label>
              <TagInput
                placeholder="Add alias..."
                tags={aliases}
                setTags={setAliases}
              />
              <p className="text-xs text-muted-foreground">
                Nicknames or alternate spellings for search only (e.g. 'Iron Lady'). Press Enter to add.
              </p>
            </div>
          </>
        )}

        {/* Year Built */}
        {showYear && (
          <div className="space-y-2">
            <Label htmlFor="year_completed">Year Built</Label>
            <Input
              id="year_completed"
              type="number"
              value={year_completed}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 1973"
              autoComplete="off"
            />
          </div>
        )}

        {/* Architects */}
        {showArchitects && (
          <div className="space-y-2">
            <Label>Architects</Label>
            <ArchitectSelect
              selectedArchitects={architects}
              setSelectedArchitects={setArchitects}
              placeholder="Search architects or add new..."
            />
            <p className="text-xs text-muted-foreground">
              Add multiple architects if applicable. If not found, you can create a new one.
            </p>
          </div>
        )}

        {/* Add Buttons Row */}
        {(!showYear || !showArchitects || !showAliases) && (
            <div className="flex gap-2 flex-wrap">
                {!showAliases && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full h-8"
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
                        className="rounded-full h-8"
                        onClick={() => setShowYear(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add Year
                    </Button>
                )}
                {!showArchitects && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full h-8"
                        onClick={() => setShowArchitects(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add Architects
                    </Button>
                )}
            </div>
        )}
      </div>

      <Separator />

      {/* Functional Classification */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold">Functional Classification</h3>
          <p className="text-sm text-muted-foreground">Define the primary purpose of the building.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-select">Category</Label>
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

          <div className="space-y-2">
            <Label>Typology</Label>
            {isLoadingTypologies ? (
               <div className="flex flex-wrap gap-2">
                 <Skeleton className="h-8 w-24" />
                 <Skeleton className="h-8 w-32" />
                 <Skeleton className="h-8 w-20" />
               </div>
            ) : !functional_category_id ? (
              <div className="p-4 border border-dashed rounded-md text-sm text-muted-foreground text-center bg-muted/20">
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
                      className="h-8 text-sm px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={handleAddTypology}
                            disabled={isAddingTypologyLoading}
                        >
                            {isAddingTypologyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        className="h-8 text-sm px-2 text-muted-foreground hover:text-foreground ml-1"
                        onClick={() => setIsAddingTypology(true)}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add another
                    </Button>
                )}
              </ToggleGroup>
            )}
            {functional_category_id && (typologies || []).filter(t => t.parent_category_id === functional_category_id).length === 0 && (
                 <p className="text-sm text-muted-foreground">No typologies found for this category.</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Characteristics / Attributes */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold">Characteristics</h3>
          <p className="text-sm text-muted-foreground">Add tags to describe the building's features.</p>
        </div>

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
                  <Label className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                    {group.name}
                  </Label>
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
                        className="h-8 text-sm px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
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
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={handleAddAttribute}
                          disabled={isAddingAttributeLoading}
                        >
                          {isAddingAttributeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        className="h-8 text-sm px-2 text-muted-foreground hover:text-foreground ml-1"
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
      </div>

      <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
