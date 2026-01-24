import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildingSchema } from "@/lib/validations/building";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ArchitectSelect, Architect } from "@/components/ui/architect-select";

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
      <div className="space-y-4 border rounded-md p-4">
        <h3 className="text-sm font-medium">Classification</h3>
        {/* TODO: Add FunctionalCategorySelect component here */}
        <div className="text-sm text-muted-foreground italic">
          Category selector to be implemented.
          (Current ID: {functional_category_id || "None"})
        </div>

        {/* TODO: Add FunctionalTypologySelect component here */}
         <div className="text-sm text-muted-foreground italic">
          Typology selector to be implemented.
          (Selected: {functional_typology_ids.length})
        </div>
      </div>

      {/* SECCION 4: Attributes */}
      <div className="space-y-4 border rounded-md p-4">
        <h3 className="text-sm font-medium">Attributes</h3>
        {/* TODO: Add AttributeSelect component here */}
        <div className="text-sm text-muted-foreground italic">
          Attribute selector to be implemented.
           (Selected: {selected_attribute_ids.length})
        </div>
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
