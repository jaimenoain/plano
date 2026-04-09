import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface BuildingAttributesData {
  typology?: string[] | null;
  materials?: string[] | null;
  styles?: string[] | { name: string }[] | null;
  context?: string | null;
  intervention?: string | null;
  category?: string | null;
  year_completed?: number | null;
  status?: string | null;
}

interface BuildingAttributesProps {
  building: BuildingAttributesData;
  className?: string;
}

export const BuildingAttributes = ({
  building,
  className,
}: BuildingAttributesProps) => {
  const isEmpty = (val: unknown) => {
    if (val === null || val === undefined) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === "string" && val.trim() === "") return true;
    return false;
  };

  const resolveLabels = (val: unknown): string[] => {
    if (!Array.isArray(val)) return [];
    if (val.length === 0) return [];
    const isObjectArray =
      typeof val[0] === "object" && val[0] !== null && "name" in val[0];
    return isObjectArray
      ? (val as { name: string }[]).map((item) => item.name)
      : (val as string[]);
  };

  // Scalar fields — rendered as plain text
  const scalarFields = [
    { key: "year_completed", label: "Year", value: building.year_completed?.toString() },
    { key: "category",       label: "Category", value: building.category },
    { key: "context",        label: "Context",  value: building.context },
    { key: "intervention",   label: "Intervention", value: building.intervention },
    { key: "status",         label: "Status",   value: building.status },
  ].filter((f) => !isEmpty(f.value));

  // Multi-value fields — rendered as badge chips
  const chipFields = [
    { key: "typology",  label: "Typology",  items: resolveLabels(building.typology) },
    { key: "materials", label: "Materials", items: resolveLabels(building.materials) },
    { key: "styles",    label: "Styles",    items: resolveLabels(building.styles) },
  ].filter((f) => f.items.length > 0);

  if (scalarFields.length === 0 && chipFields.length === 0) return null;

  return (
    <dl className={cn("space-y-2.5 text-sm", className)}>
      {scalarFields.map((field) => (
        <div key={field.key} className="flex items-baseline gap-3">
          <dt className="w-[88px] shrink-0 text-[11px] font-medium uppercase tracking-widest text-text-secondary">
            {field.label}
          </dt>
          <dd className="text-text-primary">{field.value}</dd>
        </div>
      ))}

      {chipFields.map((field) => (
        <div key={field.key} className="flex items-start gap-3">
          <dt className="w-[88px] shrink-0 text-[11px] font-medium uppercase tracking-widest text-text-secondary pt-0.5">
            {field.label}
          </dt>
          <dd className="flex flex-wrap gap-1.5">
            {field.items.map((item) => (
              <Badge key={item} variant="outline" className="text-[11px] px-2 py-0">
                {item}
              </Badge>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
};