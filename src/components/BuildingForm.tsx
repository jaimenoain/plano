import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildingSchema } from "@/lib/validations/building";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ArchitectSelect, Architect } from "@/components/ui/architect-select";
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

export interface BuildingFormData {
  name: string;
  year_completed: number | null;
  architects: Architect[];
  functional_category_id: string;
  functional_typology_ids: string[];
  selected_attribute_ids: string[];
  main_image_url: string | null;
}

interface BuildingFormProps {
  initialValues: BuildingFormData;
  onSubmit: (data: BuildingFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}

export function BuildingForm({ initialValues, onSubmit, isSubmitting, submitLabel }: BuildingFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [year_completed, setYear] = useState<string>(initialValues.year_completed?.toString() || "");
  const [architects, setArchitects] = useState<Architect[]>(initialValues.architects);
  const [functional_category_id, setCategoryId] = useState<string>(initialValues.functional_category_id);
  const [functional_typology_ids, setTypologyIds] = useState<string[]>(initialValues.functional_typology_ids);
  const [selected_attribute_ids, setAttributeIds] = useState<string[]>(initialValues.selected_attribute_ids);

  // Mantenemos la lógica de estado de "main" para mostrar/ocultar campos
  const [showYear, setShowYear] = useState(!!initialValues.year_completed);
  const [showArchitects, setShowArchitects] = useState(initialValues.architects.length > 0);

  // Logic for showing/hiding classification fields could be added here
  // const [showClassification, setShowClassification] = useState(...);

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    setTypologyIds([]); // Clear typologies when category changes
  };

  const handleAttributeGroupChange = (groupId: string, newGroupSelection: string[]) => {
    // Find all attributes belonging to this group
    const groupAttributeIds = attributes
      ?.filter((attr) => attr.attribute_group_id === groupId)
      .map((attr) => attr.id) || [];

    // Filter out any attributes from this group from the current selection
    const otherAttributes = selected_attribute_ids.filter(
      (id) => !groupAttributeIds.includes(id)
    );

    // Combine other attributes with the new selection for this group
    setAttributeIds([...otherAttributes, ...newGroupSelection]);
  };

  const { data: categories } = useQuery({
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

  const { data: typologies } = useQuery({
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

  const { data: attributeGroups } = useQuery({
    queryKey: ["attribute_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attribute_groups")
        .select("*")
        .order("name"); // or sort_order if available, using name for now
      if (error) throw error;
      return data as AttributeGroup[];
    },
  });

  const { data: attributes } = useQuery({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rawData = {
        name,
        year_completed,
        architects,
        functional_category_id,
        functional_typology_ids,
        selected_attribute_ids,
        main_image_url: initialValues.main_image_url,
      };

      const validationResult = buildingSchema.safeParse(rawData);

      if (!validationResult.success) {
        validationResult.error.errors.forEach((err) => {
          toast.error(err.message);
        });
        return;
      }

      const formData: BuildingFormData = {
        ...validationResult.data,
        main_image_url: validationResult.data.main_image_url ?? null,
      };

      await onSubmit(formData);

    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sydney Opera House"
          required
          autoComplete="off"
        />
      </div>

      {/* SECCION 1: Año (Lógica visual de main + Input estándar) */}
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

      {/* SECCION 2: Arquitectos (Lógica visual de main + Componente ArchitectSelect de la nueva rama) */}
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

      {/* SECCION 3: Classification (Categories & Typologies) */}
      <div className="space-y-6 border rounded-md p-4">
        <h3 className="text-sm font-medium">Function</h3>

        <div className="space-y-3">
          <Label>Category</Label>
          <Select value={functional_category_id} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full">
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
        </div>

        <div className="space-y-3">
          <Label>Typology</Label>
          {!functional_category_id ? (
            <p className="text-sm text-muted-foreground italic">
              Please select a category first to see available typologies.
            </p>
          ) : (
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={functional_typology_ids}
              onValueChange={setTypologyIds}
              className="justify-start flex-wrap gap-2"
            >
              {typologies
                ?.filter((t) => t.functional_category_id === functional_category_id)
                .map((typology) => (
                  <ToggleGroupItem
                    key={typology.id}
                    value={typology.id}
                    className="h-8 text-sm px-3"
                  >
                    {typology.name}
                  </ToggleGroupItem>
                ))}
            </ToggleGroup>
          )}
        </div>
      </div>

      {/* SECCION 4: Attributes */}
      <div className="space-y-6 border rounded-md p-4">
        <h3 className="text-sm font-medium">Characteristics</h3>

        {attributeGroups?.map((group) => {
          const groupAttributes = attributes?.filter(
            (attr) => attr.attribute_group_id === group.id
          );

          if (!groupAttributes || groupAttributes.length === 0) return null;

          return (
            <div key={group.id} className="space-y-3">
              <Label className="text-xs uppercase text-muted-foreground tracking-wider">
                {group.name}
              </Label>
              <ToggleGroup
                type="multiple"
                variant="outline"
                value={selected_attribute_ids}
                onValueChange={(newSelection) => handleAttributeGroupChange(group.id, newSelection)}
                className="justify-start flex-wrap gap-2"
              >
                {groupAttributes.map((attr) => (
                  <ToggleGroupItem
                    key={attr.id}
                    value={attr.id}
                    className="h-8 text-sm px-3"
                  >
                    {attr.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          );
        })}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
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
