import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildingSchema, editBuildingSchema } from "@/lib/validations/building";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ArchitectSelect, Architect } from "@/components/ui/architect-select";
import { StyleSelect, StyleSummary } from "@/components/ui/style-select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FunctionalCategory, FunctionalTypology, AttributeGroup, Attribute } from "@/types/classification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export interface BuildingFormData {
  name: string;
  year_completed: number | null;
  architects: Architect[];
  styles: StyleSummary[];
  functional_category_id: string | null;
  functional_typology_ids: string[];
  selected_attribute_ids: string[];
  main_image_url: string | null;
}

interface BuildingFormProps {
  initialValues: BuildingFormData;
  onSubmit: (data: BuildingFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  mode?: 'create' | 'edit';
}

export function BuildingForm({ initialValues, onSubmit, isSubmitting, submitLabel, mode = 'create' }: BuildingFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [year_completed, setYear] = useState<string>(initialValues.year_completed?.toString() || "");
  const [architects, setArchitects] = useState<Architect[]>(initialValues.architects);
  const [styles, setStyles] = useState<StyleSummary[]>(initialValues.styles || []);
  const [functional_category_id, setCategoryId] = useState<string>(initialValues.functional_category_id || "");
  const [functional_typology_ids, setTypologyIds] = useState<string[]>(initialValues.functional_typology_ids);
  const [selected_attribute_ids, setAttributeIds] = useState<string[]>(initialValues.selected_attribute_ids);

  const [showYear, setShowYear] = useState(!!initialValues.year_completed);
  const [showArchitects, setShowArchitects] = useState(initialValues.architects.length > 0);
  const [showStyles, setShowStyles] = useState((initialValues.styles || []).length > 0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rawData = {
        name,
        year_completed,
        architects,
        styles,
        functional_category_id,
        functional_typology_ids,
        selected_attribute_ids,
        main_image_url: initialValues.main_image_url,
      };

      const schema = mode === 'edit' ? editBuildingSchema : buildingSchema;
      const validationResult = schema.safeParse(rawData);

      if (!validationResult.success) {
        validationResult.error.errors.forEach((err) => {
          toast.error(err.message);
        });
        return;
      }

      const formData: BuildingFormData = {
        ...validationResult.data,
        functional_category_id: validationResult.data.functional_category_id ?? null,
        main_image_url: validationResult.data.main_image_url ?? null,
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
          <Label htmlFor="name">Name {mode === 'create' && "*"}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sydney Opera House"
            required={mode === 'create'}
            autoComplete="off"
          />
        </div>

        {/* Year Built */}
        {showYear ? (
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
        ) : (
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

        {/* Architects */}
        {showArchitects ? (
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
        ) : (
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

        {/* Styles */}
        {showStyles ? (
          <div className="space-y-2">
            <Label>Architectural Styles</Label>
            <StyleSelect
              selectedStyles={styles}
              setSelectedStyles={setStyles}
              placeholder="Search styles or add new..."
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full h-8"
            onClick={() => setShowStyles(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Styles
          </Button>
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
            <Label htmlFor="category-select">Category {mode === 'create' && "*"}</Label>
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
            <Label>Typology {mode === 'create' && "*"}</Label>
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
                        className="h-8 text-sm px-3 data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground border-input"
                      >
                        {attr.name}
                      </ToggleGroupItem>
                    ))}
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
