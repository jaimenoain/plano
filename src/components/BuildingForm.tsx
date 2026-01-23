import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteTagInput } from "@/components/ui/autocomplete-tag-input";
import { buildingSchema } from "@/lib/validations/building";
import { toTitleCase } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ArchitectSelect, Architect } from "@/components/ui/architect-select";

const ARCHITECTURAL_STYLES = [
  "Brutalist",
  "Bauhaus",
  "Gothic",
  "Modernist",
  "Art Deco",
  "Neoclassical",
  "Contemporary",
  "Industrial",
];

export interface BuildingFormData {
  name: string;
  year_completed: number | null;
  architects: Architect[];
  styles: string[];
  description: string;
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
  const [styles, setStyles] = useState<string[]>(initialValues.styles);
  const [description, setDescription] = useState(initialValues.description);

  // Mantenemos la lógica de estado de "main" para mostrar/ocultar campos
  const [showYear, setShowYear] = useState(!!initialValues.year_completed);
  const [showArchitects, setShowArchitects] = useState(initialValues.architects.length > 0);
  const [showStyles, setShowStyles] = useState(initialValues.styles.length > 0);
  const [showDescription, setShowDescription] = useState(!!initialValues.description);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rawData = {
        name,
        year_completed,
        architects,
        styles,
        description,
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

      {/* SECCION 3: Estilos (Lógica visual de main + AutocompleteTagInput estándar) */}
      {showStyles ? (
        <div className="space-y-2">
          <Label>Architectural Styles</Label>
          <AutocompleteTagInput
            tags={styles}
            setTags={setStyles}
            suggestions={ARCHITECTURAL_STYLES}
            placeholder="Type to search or add style..."
            normalize={toTitleCase}
          />
          <p className="text-xs text-muted-foreground">
            Select from list or type to add custom style.
          </p>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full h-8"
          onClick={() => setShowStyles(true)}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Style
        </Button>
      )}

      {/* SECCION 4: Descripción (Lógica visual de main + Textarea estándar) */}
      {showDescription ? (
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the building..."
            className="min-h-[100px]"
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full h-8"
          onClick={() => setShowDescription(true)}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Description
        </Button>
      )}

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